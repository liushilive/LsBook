/*global define:false */
/**
 * Copyright 2012-2017 Craig Campbell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Mousetrap is a simple keyboard shortcut library for Javascript with
 * no external dependencies
 *
 * @version 1.6.3
 * @url craig.is/killing/mice
 */
(function (window, document, undefined) {

  // Check if mousetrap is used inside browser, if not, return
  if (!window) {
    return;
  }

  /**
   * mapping of special keycodes to their corresponding keys
   *
   * everything in this dictionary cannot use keypress events
   * so it has to be here to map to the correct keycodes for
   * keyup/keydown events
   *
   * @type {Object}
   */
  var _MAP = {
    8: 'backspace',
    9: 'tab',
    13: 'enter',
    16: 'shift',
    17: 'ctrl',
    18: 'alt',
    20: 'capslock',
    27: 'esc',
    32: 'space',
    33: 'pageup',
    34: 'pagedown',
    35: 'end',
    36: 'home',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    45: 'ins',
    46: 'del',
    91: 'meta',
    93: 'meta',
    224: 'meta'
  };

  /**
   * mapping for special characters so they can support
   *
   * this dictionary is only used incase you want to bind a
   * keyup or keydown event to one of these keys
   *
   * @type {Object}
   */
  var _KEYCODE_MAP = {
    106: '*',
    107: '+',
    109: '-',
    110: '.',
    111: '/',
    186: ';',
    187: '=',
    188: ',',
    189: '-',
    190: '.',
    191: '/',
    192: '`',
    219: '[',
    220: '\\',
    221: ']',
    222: '\''
  };

  /**
   * this is a mapping of keys that require shift on a US keypad
   * back to the non shift equivelents
   *
   * this is so you can use keyup events with these keys
   *
   * note that this will only work reliably on US keyboards
   *
   * @type {Object}
   */
  var _SHIFT_MAP = {
    '~': '`',
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    '_': '-',
    '+': '=',
    ':': ';',
    '\"': '\'',
    '<': ',',
    '>': '.',
    '?': '/',
    '|': '\\'
  };

  /**
   * this is a list of special strings you can use to map
   * to modifier keys when you specify your keyboard shortcuts
   *
   * @type {Object}
   */
  var _SPECIAL_ALIASES = {
    'option': 'alt',
    'command': 'meta',
    'return': 'enter',
    'escape': 'esc',
    'plus': '+',
    'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
  };

  /**
   * variable to store the flipped version of _MAP from above
   * needed to check if we should use keypress or not when no action
   * is specified
   *
   * @type {Object|undefined}
   */
  var _REVERSE_MAP;

  /**
   * loop through the f keys, f1 to f19 and add them to the map
   * programatically
   */
  for (var i = 1; i < 20; ++i) {
    _MAP[111 + i] = 'f' + i;
  }

  /**
   * loop through to map numbers on the numeric keypad
   */
  for (i = 0; i <= 9; ++i) {

    // This needs to use a string cause otherwise since 0 is falsey
    // mousetrap will never fire for numpad 0 pressed as part of a keydown
    // event.
    //
    // @see https://github.com/ccampbell/mousetrap/pull/258
    _MAP[i + 96] = i.toString();
  }

  /**
   * cross browser add event method
   *
   * @param {Element|HTMLDocument} object
   * @param {string} type
   * @param {Function} callback
   * @returns void
   */
  function _addEvent(object, type, callback) {
    if (object.addEventListener) {
      object.addEventListener(type, callback, false);
      return;
    }

    object.attachEvent('on' + type, callback);
  }

  /**
   * takes the event and returns the key character
   *
   * @param {Event} e
   * @return {string}
   */
  function _characterFromEvent(e) {

    // for keypress events we should return the character as is
    if (e.type == 'keypress') {
      var character = String.fromCharCode(e.which);

      // if the shift key is not pressed then it is safe to assume
      // that we want the character to be lowercase.  this means if
      // you accidentally have caps lock on then your key bindings
      // will continue to work
      //
      // the only side effect that might not be desired is if you
      // bind something like 'A' cause you want to trigger an
      // event when capital A is pressed caps lock will no longer
      // trigger the event.  shift+a will though.
      if (!e.shiftKey) {
        character = character.toLowerCase();
      }

      return character;
    }

    // for non keypress events the special maps are needed
    if (_MAP[e.which]) {
      return _MAP[e.which];
    }

    if (_KEYCODE_MAP[e.which]) {
      return _KEYCODE_MAP[e.which];
    }

    // if it is not in the special map

    // with keydown and keyup events the character seems to always
    // come in as an uppercase character whether you are pressing shift
    // or not.  we should make sure it is always lowercase for comparisons
    return String.fromCharCode(e.which).toLowerCase();
  }

  /**
   * checks if two arrays are equal
   *
   * @param {Array} modifiers1
   * @param {Array} modifiers2
   * @returns {boolean}
   */
  function _modifiersMatch(modifiers1, modifiers2) {
    return modifiers1.sort().join(',') === modifiers2.sort().join(',');
  }

  /**
   * takes a key event and figures out what the modifiers are
   *
   * @param {Event} e
   * @returns {Array}
   */
  function _eventModifiers(e) {
    var modifiers = [];

    if (e.shiftKey) {
      modifiers.push('shift');
    }

    if (e.altKey) {
      modifiers.push('alt');
    }

    if (e.ctrlKey) {
      modifiers.push('ctrl');
    }

    if (e.metaKey) {
      modifiers.push('meta');
    }

    return modifiers;
  }

  /**
   * prevents default for this event
   *
   * @param {Event} e
   * @returns void
   */
  function _preventDefault(e) {
    if (e.preventDefault) {
      e.preventDefault();
      return;
    }

    e.returnValue = false;
  }

  /**
   * stops propogation for this event
   *
   * @param {Event} e
   * @returns void
   */
  function _stopPropagation(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
      return;
    }

    e.cancelBubble = true;
  }

  /**
   * determines if the keycode specified is a modifier key or not
   *
   * @param {string} key
   * @returns {boolean}
   */
  function _isModifier(key) {
    return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
  }

  /**
   * reverses the map lookup so that we can look for specific keys
   * to see what can and can't use keypress
   *
   * @return {Object}
   */
  function _getReverseMap() {
    if (!_REVERSE_MAP) {
      _REVERSE_MAP = {};
      for (var key in _MAP) {

        // pull out the numeric keypad from here cause keypress should
        // be able to detect the keys from the character
        if (key > 95 && key < 112) {
          continue;
        }

        if (_MAP.hasOwnProperty(key)) {
          _REVERSE_MAP[_MAP[key]] = key;
        }
      }
    }
    return _REVERSE_MAP;
  }

  /**
   * picks the best action based on the key combination
   *
   * @param {string} key - character for key
   * @param {Array} modifiers
   * @param {string=} action passed in
   */
  function _pickBestAction(key, modifiers, action) {

    // if no action was picked in we should try to pick the one
    // that we think would work best for this key
    if (!action) {
      action = _getReverseMap()[key] ? 'keydown' : 'keypress';
    }

    // modifier keys don't work as expected with keypress,
    // switch to keydown
    if (action == 'keypress' && modifiers.length) {
      action = 'keydown';
    }

    return action;
  }

  /**
   * Converts from a string key combination to an array
   *
   * @param  {string} combination like "command+shift+l"
   * @return {Array}
   */
  function _keysFromString(combination) {
    if (combination === '+') {
      return ['+'];
    }

    combination = combination.replace(/\+{2}/g, '+plus');
    return combination.split('+');
  }

  /**
   * Gets info for a specific key combination
   *
   * @param  {string} combination key combination ("command+s" or "a" or "*")
   * @param  {string=} action
   * @returns {Object}
   */
  function _getKeyInfo(combination, action) {
    var keys;
    var key;
    var i;
    var modifiers = [];

    // take the keys from this pattern and figure out what the actual
    // pattern is all about
    keys = _keysFromString(combination);

    for (i = 0; i < keys.length; ++i) {
      key = keys[i];

      // normalize key names
      if (_SPECIAL_ALIASES[key]) {
        key = _SPECIAL_ALIASES[key];
      }

      // if this is not a keypress event then we should
      // be smart about using shift keys
      // this will only work for US keyboards however
      if (action && action != 'keypress' && _SHIFT_MAP[key]) {
        key = _SHIFT_MAP[key];
        modifiers.push('shift');
      }

      // if this key is a modifier then add it to the list of modifiers
      if (_isModifier(key)) {
        modifiers.push(key);
      }
    }

    // depending on what the key combination is
    // we will try to pick the best event for it
    action = _pickBestAction(key, modifiers, action);

    return {
      key: key,
      modifiers: modifiers,
      action: action
    };
  }

  function _belongsTo(element, ancestor) {
    if (element === null || element === document) {
      return false;
    }

    if (element === ancestor) {
      return true;
    }

    return _belongsTo(element.parentNode, ancestor);
  }

  function Mousetrap(targetElement) {
    var self = this;

    targetElement = targetElement || document;

    if (!(self instanceof Mousetrap)) {
      return new Mousetrap(targetElement);
    }

    /**
     * element to attach key events to
     *
     * @type {Element}
     */
    self.target = targetElement;

    /**
     * a list of all the callbacks setup via Mousetrap.bind()
     *
     * @type {Object}
     */
    self._callbacks = {};

    /**
     * direct map of string combinations to callbacks used for trigger()
     *
     * @type {Object}
     */
    self._directMap = {};

    /**
     * keeps track of what level each sequence is at since multiple
     * sequences can start out with the same sequence
     *
     * @type {Object}
     */
    var _sequenceLevels = {};

    /**
     * variable to store the setTimeout call
     *
     * @type {null|number}
     */
    var _resetTimer;

    /**
     * temporary state where we will ignore the next keyup
     *
     * @type {boolean|string}
     */
    var _ignoreNextKeyup = false;

    /**
     * temporary state where we will ignore the next keypress
     *
     * @type {boolean}
     */
    var _ignoreNextKeypress = false;

    /**
     * are we currently inside of a sequence?
     * type of action ("keyup" or "keydown" or "keypress") or false
     *
     * @type {boolean|string}
     */
    var _nextExpectedAction = false;

    /**
     * resets all sequence counters except for the ones passed in
     *
     * @param {Object} doNotReset
     * @returns void
     */
    function _resetSequences(doNotReset) {
      doNotReset = doNotReset || {};

      var activeSequences = false,
        key;

      for (key in _sequenceLevels) {
        if (doNotReset[key]) {
          activeSequences = true;
          continue;
        }
        _sequenceLevels[key] = 0;
      }

      if (!activeSequences) {
        _nextExpectedAction = false;
      }
    }

    /**
     * finds all callbacks that match based on the keycode, modifiers,
     * and action
     *
     * @param {string} character
     * @param {Array} modifiers
     * @param {Event|Object} e
     * @param {string=} sequenceName - name of the sequence we are looking for
     * @param {string=} combination
     * @param {number=} level
     * @returns {Array}
     */
    function _getMatches(character, modifiers, e, sequenceName, combination, level) {
      var i;
      var callback;
      var matches = [];
      var action = e.type;

      // if there are no events related to this keycode
      if (!self._callbacks[character]) {
        return [];
      }

      // if a modifier key is coming up on its own we should allow it
      if (action == 'keyup' && _isModifier(character)) {
        modifiers = [character];
      }

      // loop through all callbacks for the key that was pressed
      // and see if any of them match
      for (i = 0; i < self._callbacks[character].length; ++i) {
        callback = self._callbacks[character][i];

        // if a sequence name is not specified, but this is a sequence at
        // the wrong level then move onto the next match
        if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
          continue;
        }

        // if the action we are looking for doesn't match the action we got
        // then we should keep going
        if (action != callback.action) {
          continue;
        }

        // if this is a keypress event and the meta key and control key
        // are not pressed that means that we need to only look at the
        // character, otherwise check the modifiers as well
        //
        // chrome will not fire a keypress if meta or control is down
        // safari will fire a keypress if meta or meta+shift is down
        // firefox will fire a keypress if meta or control is down
        if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

          // when you bind a combination or sequence a second time it
          // should overwrite the first one.  if a sequenceName or
          // combination is specified in this call it does just that
          //
          // @todo make deleting its own method?
          var deleteCombo = !sequenceName && callback.combo == combination;
          var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
          if (deleteCombo || deleteSequence) {
            self._callbacks[character].splice(i, 1);
          }

          matches.push(callback);
        }
      }

      return matches;
    }

    /**
     * actually calls the callback function
     *
     * if your callback function returns false this will use the jquery
     * convention - prevent default and stop propogation on the event
     *
     * @param {Function} callback
     * @param {Event} e
     * @returns void
     */
    function _fireCallback(callback, e, combo, sequence) {

      // if this event should not happen stop here
      if (self.stopCallback(e, e.target || e.srcElement, combo, sequence)) {
        return;
      }

      if (callback(e, combo) === false) {
        _preventDefault(e);
        _stopPropagation(e);
      }
    }

    /**
     * handles a character key event
     *
     * @param {string} character
     * @param {Array} modifiers
     * @param {Event} e
     * @returns void
     */
    self._handleKey = function (character, modifiers, e) {
      var callbacks = _getMatches(character, modifiers, e);
      var i;
      var doNotReset = {};
      var maxLevel = 0;
      var processedSequenceCallback = false;

      // Calculate the maxLevel for sequences so we can only execute the longest callback sequence
      for (i = 0; i < callbacks.length; ++i) {
        if (callbacks[i].seq) {
          maxLevel = Math.max(maxLevel, callbacks[i].level);
        }
      }

      // loop through matching callbacks for this key event
      for (i = 0; i < callbacks.length; ++i) {

        // fire for all sequence callbacks
        // this is because if for example you have multiple sequences
        // bound such as "g i" and "g t" they both need to fire the
        // callback for matching g cause otherwise you can only ever
        // match the first one
        if (callbacks[i].seq) {

          // only fire callbacks for the maxLevel to prevent
          // subsequences from also firing
          //
          // for example 'a option b' should not cause 'option b' to fire
          // even though 'option b' is part of the other sequence
          //
          // any sequences that do not match here will be discarded
          // below by the _resetSequences call
          if (callbacks[i].level != maxLevel) {
            continue;
          }

          processedSequenceCallback = true;

          // keep a list of which sequences were matches for later
          doNotReset[callbacks[i].seq] = 1;
          _fireCallback(callbacks[i].callback, e, callbacks[i].combo, callbacks[i].seq);
          continue;
        }

        // if there were no sequence matches but we are still here
        // that means this is a regular match so we should fire that
        if (!processedSequenceCallback) {
          _fireCallback(callbacks[i].callback, e, callbacks[i].combo);
        }
      }

      // if the key you pressed matches the type of sequence without
      // being a modifier (ie "keyup" or "keypress") then we should
      // reset all sequences that were not matched by this event
      //
      // this is so, for example, if you have the sequence "h a t" and you
      // type "h e a r t" it does not match.  in this case the "e" will
      // cause the sequence to reset
      //
      // modifier keys are ignored because you can have a sequence
      // that contains modifiers such as "enter ctrl+space" and in most
      // cases the modifier key will be pressed before the next key
      //
      // also if you have a sequence such as "ctrl+b a" then pressing the
      // "b" key will trigger a "keypress" and a "keydown"
      //
      // the "keydown" is expected when there is a modifier, but the
      // "keypress" ends up matching the _nextExpectedAction since it occurs
      // after and that causes the sequence to reset
      //
      // we ignore keypresses in a sequence that directly follow a keydown
      // for the same character
      var ignoreThisKeypress = e.type == 'keypress' && _ignoreNextKeypress;
      if (e.type == _nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
        _resetSequences(doNotReset);
      }

      _ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';
    };

    /**
     * handles a keydown event
     *
     * @param {Event} e
     * @returns void
     */
    function _handleKeyEvent(e) {

      // normalize e.which for key events
      // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
      if (typeof e.which !== 'number') {
        e.which = e.keyCode;
      }

      var character = _characterFromEvent(e);

      // no character found then stop
      if (!character) {
        return;
      }

      // need to use === for the character check because the character can be 0
      if (e.type == 'keyup' && _ignoreNextKeyup === character) {
        _ignoreNextKeyup = false;
        return;
      }

      self.handleKey(character, _eventModifiers(e), e);
    }

    /**
     * called to set a 1 second timeout on the specified sequence
     *
     * this is so after each key press in the sequence you have 1 second
     * to press the next key before you have to start over
     *
     * @returns void
     */
    function _resetSequenceTimer() {
      clearTimeout(_resetTimer);
      _resetTimer = setTimeout(_resetSequences, 1000);
    }

    /**
     * binds a key sequence to an event
     *
     * @param {string} combo - combo specified in bind call
     * @param {Array} keys
     * @param {Function} callback
     * @param {string=} action
     * @returns void
     */
    function _bindSequence(combo, keys, callback, action) {

      // start off by adding a sequence level record for this combination
      // and setting the level to 0
      _sequenceLevels[combo] = 0;

      /**
       * callback to increase the sequence level for this sequence and reset
       * all other sequences that were active
       *
       * @param {string} nextAction
       * @returns {Function}
       */
      function _increaseSequence(nextAction) {
        return function () {
          _nextExpectedAction = nextAction;
          ++_sequenceLevels[combo];
          _resetSequenceTimer();
        };
      }

      /**
       * wraps the specified callback inside of another function in order
       * to reset all sequence counters as soon as this sequence is done
       *
       * @param {Event} e
       * @returns void
       */
      function _callbackAndReset(e) {
        _fireCallback(callback, e, combo);

        // we should ignore the next key up if the action is key down
        // or keypress.  this is so if you finish a sequence and
        // release the key the final key will not trigger a keyup
        if (action !== 'keyup') {
          _ignoreNextKeyup = _characterFromEvent(e);
        }

        // weird race condition if a sequence ends with the key
        // another sequence begins with
        setTimeout(_resetSequences, 10);
      }

      // loop through keys one at a time and bind the appropriate callback
      // function.  for any key leading up to the final one it should
      // increase the sequence. after the final, it should reset all sequences
      //
      // if an action is specified in the original bind call then that will
      // be used throughout.  otherwise we will pass the action that the
      // next key in the sequence should match.  this allows a sequence
      // to mix and match keypress and keydown events depending on which
      // ones are better suited to the key provided
      for (var i = 0; i < keys.length; ++i) {
        var isFinal = i + 1 === keys.length;
        var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence(action || _getKeyInfo(keys[i + 1]).action);
        _bindSingle(keys[i], wrappedCallback, action, combo, i);
      }
    }

    /**
     * binds a single keyboard combination
     *
     * @param {string} combination
     * @param {Function} callback
     * @param {string=} action
     * @param {string=} sequenceName - name of sequence if part of sequence
     * @param {number=} level - what part of the sequence the command is
     * @returns void
     */
    function _bindSingle(combination, callback, action, sequenceName, level) {

      // store a direct mapped reference for use with Mousetrap.trigger
      self._directMap[combination + ':' + action] = callback;

      // make sure multiple spaces in a row become a single space
      combination = combination.replace(/\s+/g, ' ');

      var sequence = combination.split(' ');
      var info;

      // if this pattern is a sequence of keys then run through this method
      // to reprocess each pattern one key at a time
      if (sequence.length > 1) {
        _bindSequence(combination, sequence, callback, action);
        return;
      }

      info = _getKeyInfo(combination, action);

      // make sure to initialize array if this is the first time
      // a callback is added for this key
      self._callbacks[info.key] = self._callbacks[info.key] || [];

      // remove an existing match if there is one
      _getMatches(info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);

      // add this call back to the array
      // if it is a sequence put it at the beginning
      // if not put it at the end
      //
      // this is important because the way these are processed expects
      // the sequence ones to come first
      self._callbacks[info.key][sequenceName ? 'unshift' : 'push']({
        callback: callback,
        modifiers: info.modifiers,
        action: info.action,
        seq: sequenceName,
        level: level,
        combo: combination
      });
    }

    /**
     * binds multiple combinations to the same callback
     *
     * @param {Array} combinations
     * @param {Function} callback
     * @param {string|undefined} action
     * @returns void
     */
    self._bindMultiple = function (combinations, callback, action) {
      for (var i = 0; i < combinations.length; ++i) {
        _bindSingle(combinations[i], callback, action);
      }
    };

    // start!
    _addEvent(targetElement, 'keypress', _handleKeyEvent);
    _addEvent(targetElement, 'keydown', _handleKeyEvent);
    _addEvent(targetElement, 'keyup', _handleKeyEvent);
  }

  /**
   * binds an event to mousetrap
   *
   * can be a single key, a combination of keys separated with +,
   * an array of keys, or a sequence of keys separated by spaces
   *
   * be sure to list the modifier keys first to make sure that the
   * correct key ends up getting bound (the last key in the pattern)
   *
   * @param {string|Array} keys
   * @param {Function} callback
   * @param {string=} action - 'keypress', 'keydown', or 'keyup'
   * @returns void
   */
  Mousetrap.prototype.bind = function (keys, callback, action) {
    var self = this;
    keys = keys instanceof Array ? keys : [keys];
    self._bindMultiple.call(self, keys, callback, action);
    return self;
  };

  /**
   * unbinds an event to mousetrap
   *
   * the unbinding sets the callback function of the specified key combo
   * to an empty function and deletes the corresponding key in the
   * _directMap dict.
   *
   * TODO: actually remove this from the _callbacks dictionary instead
   * of binding an empty function
   *
   * the keycombo+action has to be exactly the same as
   * it was defined in the bind method
   *
   * @param {string|Array} keys
   * @param {string} action
   * @returns void
   */
  Mousetrap.prototype.unbind = function (keys, action) {
    var self = this;
    return self.bind.call(self, keys, function () {
    }, action);
  };

  /**
   * triggers an event that has already been bound
   *
   * @param {string} keys
   * @param {string=} action
   * @returns void
   */
  Mousetrap.prototype.trigger = function (keys, action) {
    var self = this;
    if (self._directMap[keys + ':' + action]) {
      self._directMap[keys + ':' + action]({}, keys);
    }
    return self;
  };

  /**
   * resets the library back to its initial state.  this is useful
   * if you want to clear out the current keyboard shortcuts and bind
   * new ones - for example if you switch to another page
   *
   * @returns void
   */
  Mousetrap.prototype.reset = function () {
    var self = this;
    self._callbacks = {};
    self._directMap = {};
    return self;
  };

  /**
   * should we stop this event before firing off callbacks
   *
   * @param {Event} e
   * @param {Element} element
   * @return {boolean}
   */
  Mousetrap.prototype.stopCallback = function (e, element) {
    var self = this;

    // if the element has the class "mousetrap" then no need to stop
    if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
      return false;
    }

    if (_belongsTo(element, self.target)) {
      return false;
    }

    // Events originating from a shadow DOM are re-targetted and `e.target` is the shadow host,
    // not the initial event target in the shadow tree. Note that not all events cross the
    // shadow boundary.
    // For shadow trees with `mode: 'open'`, the initial event target is the first element in
    // the event’s composed path. For shadow trees with `mode: 'closed'`, the initial event
    // target cannot be obtained.
    if ('composedPath' in e && typeof e.composedPath === 'function') {
      // For open shadow trees, update `element` so that the following check works.
      var initialEventTarget = e.composedPath()[0];
      if (initialEventTarget !== e.target) {
        element = initialEventTarget;
      }
    }

    // stop for input, select, and textarea
    return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || element.isContentEditable;
  };

  /**
   * exposes _handleKey publicly so it can be overwritten by extensions
   */
  Mousetrap.prototype.handleKey = function () {
    var self = this;
    return self._handleKey.apply(self, arguments);
  };

  /**
   * allow custom key mappings
   */
  Mousetrap.addKeycodes = function (object) {
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        _MAP[key] = object[key];
      }
    }
    _REVERSE_MAP = null;
  };

  /**
   * Init the global mousetrap functions
   *
   * This method is needed to allow the global mousetrap functions to work
   * now that mousetrap is a constructor function.
   */
  Mousetrap.init = function () {
    var documentMousetrap = Mousetrap(document);
    for (var method in documentMousetrap) {
      if (method.charAt(0) !== '_') {
        Mousetrap[method] = (function (method) {
          return function () {
            return documentMousetrap[method].apply(documentMousetrap, arguments);
          };
        }(method));
      }
    }
  };

  Mousetrap.init();

  // expose mousetrap to the global object
  window.Mousetrap = Mousetrap;

  // expose as a common js module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mousetrap;
  }

  // expose mousetrap as an AMD module
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return Mousetrap;
    });
  }
})(typeof window !== 'undefined' ? window : null, typeof window !== 'undefined' ? document : null);

/**
 * 转换为绝对路径
 * @param base 开始路径
 * @param relative 相对路径
 */
function absolute(base, relative) {
  var stack = base.split("/"),
    parts = relative.split("/");
  stack.pop(); // remove current file name (or empty string)
  // (omit if "base" is the current folder without trailing slash)
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == ".")
      continue;
    if (parts[i] == "..")
      stack.pop();
    else
      stack.push(parts[i]);
  }
  return stack.join("/");
}

// core_index
var events = $({});
var baseKey = '';
var storage = {
  setBaseKey: function (key) {
    baseKey = key;
  },

  // 写 localstorage
  set: function (key, value) {
    key = baseKey + ':' + key;

    try {
      localStorage[key] = JSON.stringify(value);
    } catch (e) {
    }
  },

  // 通过 key 读 localstorage
  get: function (key, def) {
    var value;
    key = baseKey + ':' + key;
    // 需要 try 块，如果禁用cookies会出错
    try {
      value = localStorage[key];
    } catch (e) {
    }

    if (value === undefined) return def;

    try {
      var parsed = JSON.parse(value);
      return parsed == null ? def : parsed;
    } catch (err) {
      return value || def;
    }
  },

  // 通过 key 移除 localstorage
  remove: function (key) {
    key = baseKey + ':' + key;
    try {
      localStorage.removeItem(key);
    } catch (e) {
    }
  }
};
var started = false;
var state = {};

function setState(newState) {
  // 更新当前状态
  // state.page = newState.page;
  // state.file = newState.file;
  state.config = newState.config;
  state.basePath = newState.basePath;
  state.book = newState.book;
  state.js = newState.js;
  state.$book = $('.book');
  state.root = absolute(location.protocol + '//' + location.host + location.pathname, state.basePath);
}

var page = {
  hasChanged: function (ctx) {
    // 如果页面发生了更改，则必须在加载页面和更改导航时由主题调用此函数
    console.log('page has changed', ctx);
    setState(ctx);

    if (!started) {
      // 通知 lsbook 准备好了
      started = true;
      events.trigger('start', ctx.config);
    }

    events.trigger('page.change');
  },
  setState: setState,
  getState: function () {
    // 返回当前页面的状态
    return state;
  }
};

var isPageReady = false;
var onLoad = window.lsbook || [];

// Export APIs for plugins
var lsbook = {
  events: events,
  page: page,

  // Deprecated
  state: page.getState(),

  // Read/Write the localstorage
  storage: storage,

  // Push a function to be called once lsbook is ready
  push: function (fn) {
    if (!isPageReady) onLoad.push(fn);
    else fn();
  }
};

window.lsbook = lsbook;

$(document).ready(function () {
  isPageReady = true;

  // Call pile of function once GitBook is ready
  $.each(onLoad, function (i, fn) {
    fn();
  });
});
// end_core_index

// theme_index
function toggleDropdown(e) {
  var $dropdown = $(e.currentTarget).parent().find('.dropdown-menu');

  $dropdown.toggleClass('open');
  e.stopPropagation();
  e.preventDefault();
}

function closeDropdown(e) {
  $('.dropdown-menu').removeClass('open');
}

var dropdown = {
  init: function () {
    $(document).on('click', '.toggle-dropdown', toggleDropdown);
    $(document).on('click', '.dropdown-menu', function (e) {
      e.stopPropagation();
    });
    $(document).on('click', closeDropdown);
  }
};

function bindShortcut(keys, fn) {
  Mousetrap.bind(keys, function (e) {
    fn();
    return false;
  });
}

var keyboard = {
  init: function () {
    // Next
    bindShortcut(['right'], function (e) {
      navigation.goNext();
    });

    // Prev
    bindShortcut(['left'], function (e) {
      navigation.goPrev();
    });

    // Toggle Summary
    bindShortcut(['s'], function (e) {
      sidebar.toggle();
    });
  }
};

var loading = {
  show: function (p) {
    lsbook.state.$book.addClass('is-loading');
    p.always(function () {
      lsbook.state.$book.removeClass('is-loading');
    });

    return p;
  }
};

var platform = {
  isMobile: function () {
    return ($(document).width() <= 600);
  },
  // 用于导航链接位置的断点
  isSmallScreen: function () {
    return ($(document).width() <= 1240);
  }
};

var usePushState = (typeof history.pushState !== 'undefined');

/*
  获取当前滚动子元素
*/
function getScroller() {
  if (platform.isSmallScreen()) {
    return $('.book-body');
  } else {
    return $('.body-inner');
  }
}

/*
  滚动到内容中的特定散列标记
*/
function scrollToHash(hash) {
  var $scroller = getScroller(),
    dest = 0;

  // 如果元素不存在，不要尝试滚动
  if (!pageHasElement(hash)) {
    return;
  }

  if (hash) {
    dest = getElementTopPosition(hash);
  }

  // Unbind scroll detection
  $scroller.unbind('scroll');
  $scroller.animate({
    scrollTop: dest
  }, 800, 'swing', function () {
    // Reset scroll binding when finished
    $scroller.scroll(handleScrolling);
  });

  // Directly set chapter as active
  setChapterActive(null, hash);
}

/*
  返回该元素是否存在于页面上
 */
function pageHasElement(id) {
  var $scroller = getScroller(),
    $el = $scroller.find(id);

  return !!$el.length;
}

/*
  公用功能
*/

// 检查jQuery元素是否为空
function isEmpty(element) {
  return element.length === 0;
}

// 如果谓词对列表中的任何元素为真，则Any返回true
function any(arr, predicate) {
  return arr.length > 0 && arr.filter(predicate).length > 0;
}

/*
  返回元素的顶部位置
 */
function getElementTopPosition(id) {
  // 如果嵌套，获取元素的实际位置
  var $scroller = getScroller(),
    $container = $scroller.find('.page-inner'),
    $el = $scroller.find(id),
    $parent = $el.offsetParent(),
    dest = 0;

  // 检查jQExit是否提前，如果我们找不到这些elementsuery元素中的任何一个是空的
  if (any([$scroller, $container, $el, $parent], isEmpty)) {
    return 0;
  }

  dest = $el.position().top;

  // 注意:这可能是一个while循环，但是为了避免出现无限循环，我们将最大迭代限制为10
  var MAX_ITERATIONS = 10;
  for (var i = 0; i < MAX_ITERATIONS; i++) {
    // 当我们在$container下面找到元素的父元素时，或者当我们到达dom的顶部时(父元素的父元素就是它本身)，停止
    if ($parent.is($container) || $parent.is($parent.offsetParent())) {
      break;
    }

    // DOM树，到下一个父节点
    $el = $parent;
    dest += $el.position().top;
    $parent = $el.offsetParent();
  }

  // 返回四舍五入值，因为jQuery scrollTop()返回一个整数
  return Math.floor(dest);
}

/*
  处理滚动时更新summary
*/
var $chapters, $activeChapter;

// 在摘要和更新状态中将章节设置为活动的
function setChapterActive($chapter, hash) {
  // 没有章节，没有散列表示第一章
  if (!$chapter && !hash) {
    $chapter = $chapters.first();
  }

  // 如果提供了散列，则将其设置为活动章节
  if (!!hash) {
    // 该文件包含多个章节
    if ($chapters.length > 1) {
      $chapter = $chapters.filter(function () {
        var titleId = getChapterHash($(this));
        return titleId == hash;
      }).first();
    }
    // 只有一章，不需要搜索
    else {
      $chapter = $chapters.first();
    }
  }

  // 不要更新当前章节
  if ($chapter.is($activeChapter)) {
    return;
  }

  // 更新当前活动的章节
  $activeChapter = $chapter;

  // 向选定的章节添加类
  $chapters.removeClass('active');
  $chapter.addClass('active');

  // 如果需要，更新历史状态
  hash = getChapterHash($chapter);

  var oldUri = window.location.pathname + window.location.hash,
    uri = window.location.pathname + hash;

  if (uri != oldUri) {
    history.replaceState({path: uri}, null, uri);
  }
}

// 返回一个章节的链接哈希值
function getChapterHash($chapter) {
  var $link = $chapter.children('a'),
    hash,
    href,
    parts;

  if ($link.length) {
    href = $link.attr('href');
    if (href) {
      parts = href.split('#');
      if (parts.length > 1) {
        hash = parts[1];
      }
    }
  }

  if (hash) hash = '#' + hash;
  return (!!hash) ? hash : '';
}

// 处理用户滚动
function handleScrolling() {
  // 获取当前页面滚动
  var $scroller = getScroller(),
    scrollTop = $scroller.scrollTop(),
    scrollHeight = $scroller.prop('scrollHeight'),
    clientHeight = $scroller.prop('clientHeight'),
    nbChapters = $chapters.length,
    $chapter = null;

  // 按相反的顺序找到每个标题位置
  $($chapters.get().reverse()).each(function (index) {
    var titleId = getChapterHash($(this)),
      titleTop;

    if (!!titleId && !$chapter) {
      titleTop = getElementTopPosition(titleId);

      // 如果scroller通过当前章节，则将其设置为active
      if (scrollTop >= titleTop) {
        $chapter = $(this);
      }
    }
    // 如果到达第一章时没有激活章节，则将其设置为激活章节
    if (index == (nbChapters - 1) && !$chapter) {
      $chapter = $(this);
    }
  });

  // ScrollTop是0，设置第一章
  if (!$chapter && !scrollTop) {
    $chapter = $chapters.first();
  }

  // 如果滚动到页面底部，将last chapter设置为active
  if (!!scrollTop && (scrollHeight - scrollTop == clientHeight)) {
    $chapter = $chapters.last();
  }

  setChapterActive($chapter);
}

/*
  Handle a change of url withotu refresh the whole page
*/
var prevUri = location.href;

function handleNavigation(relativeUrl, push) {
  var prevUriParsed = $('<a>', {href: prevUri});

  var uri = absolute(window.location.pathname, relativeUrl);
  var uriParsed = $('<a>', {href: uri});
  var hash = uriParsed.prop('hash');

  // 是相同的url(只是散列改变了)吗?
  var pathHasChanged = (uriParsed.prop('pathname') !== prevUriParsed.prop('pathname'));

  // 它是一个绝对url吗
  // var isAbsolute = Boolean(uriParsed.hostname);
  var r = new RegExp('^(?:[a-z]+:)?//', 'i');
  var isAbsolute = r.test(relativeUrl);

  if (!usePushState || isAbsolute) {
    // 如果不支持pushState，则将页面刷新到新的URL
    location.href = relativeUrl;
    return;
  }

  // 不要获取相同的页面
  if (!pathHasChanged) {
    if (push) history.pushState({path: uri}, null, uri);
    return scrollToHash(hash);
  }

  prevUri = uri;

  var promise = $.Deferred(function (deferred) {
    $.ajax({
      type: 'GET',
      url: uri,
      cache: true,
      headers: {
        'Access-Control-Expose-Headers': 'X-Current-Location'
      },
      success: function (html, status, xhr) {
        // 处理服务器发出的重定向信号
        var responseURL = xhr.getResponseHeader('X-Current-Location') || uri;

        // 取代html内容
        html = html.replace(/<(\/?)(html|head|body)([^>]*)>/ig, function (a, b, c, d) {
          return '<' + b + 'div' + (b ? '' : ' data-element="' + c + '"') + d + '>';
        });

        var $page = $(html),
          $pageBody = $page.find('.book'),
          $pageHead;

        // 我们只使用历史。使用GitBook生成的页面的pushState
        if ($pageBody.length === 0) {
          var err = new Error('无效的页面，正在重定向...');
          return deferred.reject(err);
        }

        // 将url推送到历史
        if (push) {
          history.pushState({
            path: responseURL
          }, null, responseURL);
        }

        // 强制重新解析HTML以防止Safari中的错误url
        $page = $(html);
        $pageHead = $page.find('[data-element=head]');
        $pageBody = $page.find('.book');

        // 合并的头
        // !! Warning !!: 我们只更新必要的部分，以避免奇怪的行为(页面闪烁等…)

        // 更新标题
        document.title = $pageHead.find('title').text();

        // Reference to $('head');
        var $head = $('head');

        // Update next & prev <link> tags
        // Remove old
        $head.find('link[rel=prev]').remove();
        $head.find('link[rel=next]').remove();

        // Add new next * prev <link> tags
        $head.append($pageHead.find('link[rel=prev]'));
        $head.append($pageHead.find('link[rel=next]'));

        // Merge body
        var bodyClass = $('.book').attr('class');
        var scrollPosition = $('.book-summary').scrollTop();

        $pageBody.toggleClass('with-summary', $('.book').hasClass('with-summary'));

        $('.book').replaceWith($pageBody);
        $('.book').attr('class', bodyClass);
        $('.book-summary').scrollTop(scrollPosition);

        // Update state
        lsbook.state.$book = $('.book');
        preparePage(!hash);

        // 滚动到hashtag位置
        if (hash) {
          scrollToHash(hash);
        }

        deferred.resolve();
      }
    });
  }).promise();

  return loading.show(
    promise
      .fail(function (e) {
        console.log(e); // eslint-disable-line no-console
        // location.href = relativeUrl;
      })
  );
}

function updateNavigationPosition() {
  var bodyInnerWidth, pageWrapperWidth;

  bodyInnerWidth = parseInt($('.body-inner').css('width'), 10);
  pageWrapperWidth = parseInt($('.page-wrapper').css('width'), 10);
  $('.navigation-next').css('margin-right', (bodyInnerWidth - pageWrapperWidth) + 'px');

  // 重置滚动条以获取当前滚动条
  var $scroller = getScroller();
  // 取消绑定现有滚动事件
  $scroller.unbind('scroll');
  $scroller.scroll(handleScrolling);
}

function preparePage(resetScroll) {
  var $bookBody = $('.book-body');
  var $bookInner = $bookBody.find('.body-inner');
  var $pageWrapper = $bookInner.find('.page-wrapper');

  // 更新导航位置
  updateNavigationPosition();

  // Focus on content
  $pageWrapper.focus();

  // Get scroller
  var $scroller = getScroller();

  // 重置滚动
  if (resetScroll !== false) {
    $scroller.scrollTop(0);
  }

  // 获取当前页面摘要章节
  $chapters = $('.book-summary .summary .chapter')
    .filter(function () {
      var $link = $(this).children('a'),
        href = null;

      // 章节没有链接
      if (!$link.length) {
        return false;
      } else {
        href = $link.attr('href').split('#')[0];
      }

      var resolvedRef = absolute(window.location.pathname, href);
      return window.location.pathname == resolvedRef;
    });

  // 如果摘要包含到此页面的多个链接，则绑定滚动
  if ($chapters.length > 1) {
    $scroller.scroll(handleScrolling);
  }
  // 否则，只将summary章节设置为active
  else {
    $activeChapter = $chapters.first();
  }
}

function isLeftClickEvent(e) {
  return e.button === 0;
}

function isModifiedEvent(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}

/*
  句柄单击链接
*/
function handleLinkClick(e) {
  var $this = $(this);
  var target = $this.attr('target');

  if (isModifiedEvent(e) || !isLeftClickEvent(e) || target) {
    return;
  }

  e.stopPropagation();
  e.preventDefault();

  var url = $this.attr('href');
  if (url) handleNavigation(url, true);
}

var navigation = {
  init: function () {
    // 防止缓存，以便使用后退按钮工作
    // See: http://stackoverflow.com/a/15805399/983070
    $.ajaxSetup({
      cache: false
    });

    // 在加载页面时重新创建第一个页面。
    history.replaceState({path: window.location.href}, '');

    // 后退按钮劫持 :(
    window.onpopstate = function (event) {
      if (event.state === null) {
        return;
      }

      return handleNavigation(event.state.path, false);
    };

    $(document).on('click', '.navigation-prev', handleLinkClick);
    $(document).on('click', '.navigation-next', handleLinkClick);
    $(document).on('click', '.summary [data-path] a', handleLinkClick);
    $(document).on('click', '.page-inner a', handleLinkClick);

    $(window).resize(updateNavigationPosition);

    // 准备当前页面
    preparePage(false);
  },
  goNext: function () {
    var url = $('.navigation-next').attr('href');
    if (url) handleNavigation(url, true);
  },
  goPrev: function () {
    var url = $('.navigation-prev').attr('href');
    if (url) handleNavigation(url, true);
  }
};

// 切换侧边栏与动画
function toggleSidebar(_state, animation) {
  if (lsbook.state != null && isOpen() == _state) return;
  if (animation == null) animation = true;

  lsbook.state.$book.toggleClass('without-animation', !animation);
  lsbook.state.$book.toggleClass('with-summary', _state);

  lsbook.storage.set('sidebar', isOpen());
}

// 如果侧边栏打开，返回true
function isOpen() {
  return lsbook.state.$book.hasClass('with-summary');
}

var sidebar = {
  // 准备侧栏:状态和切换按钮
  init: function () {
    // 初始化最后一个状态(如果不是mobile)
    if (!platform.isMobile()) {
      toggleSidebar(lsbook.storage.get('sidebar', true), false);
    }

    // 点击手机上的链接后关闭侧边栏
    $(document).on('click', '.book-summary li.chapter a', function (e) {
      if (platform.isMobile()) toggleSidebar(false, false);
    });
  },
  isOpen: isOpen,
  toggle: toggleSidebar,
  // 使用路径列表筛选摘要
  filter: function (paths) {
    var $summary = $('.book-summary');

    $summary.find('li').each(function () {
      var path = $(this).data('path');
      var st = paths == null || paths.indexOf(path) !== -1;

      $(this).toggle(st);
      if (st) $(this).parents('li').show();
    });
  }
};

// 创建按钮列表
var buttons = [],
  // 为按钮生成Id
  BTN_ID = 0;

function generateId() {
  return 'btn-' + (BTN_ID++);
}

// 在特定位置插入jquery元素
function insertAt(parent, selector, index, element) {
  var lastIndex = parent.children(selector).length;
  if (index < 0) {
    index = Math.max(0, lastIndex + 1 + index);
  }
  parent.append(element);

  if (index < lastIndex) {
    parent.children(selector).eq(index).before(parent.children(selector).last());
  }
}

// 默认的单击处理程序
function defaultOnClick(e) {
  e.preventDefault();
}

// Create a dropdown menu
function createDropdownMenu(dropdown) {
  var $menu = $('<div>', {
    'class': 'dropdown-menu',
    'html': '<div class="dropdown-caret"><span class="caret-outer"></span><span class="caret-inner"></span></div>'
  });

  if (typeof dropdown == 'string') {
    $menu.append(dropdown);
  } else {
    var groups = dropdown.map(function (group) {
      if ($.isArray(group)) return group;
      else return [group];
    });

    // Create buttons groups
    groups.forEach(function (group) {
      var $group = $('<div>', {
        'class': 'buttons'
      });
      var sizeClass = 'size-' + group.length;

      // Append buttons
      group.forEach(function (btn) {
        btn = $.extend({
          text: '',
          className: '',
          onClick: defaultOnClick
        }, btn || {});

        var $btn = $('<button>', {
          'class': 'button ' + sizeClass + ' ' + btn.className,
          'text': btn.text
        });
        $btn.click(btn.onClick);

        $group.append($btn);
      });


      $menu.append($group);
    });

  }


  return $menu;
}

// Update a button
function updateButton(opts) {
  var $result;
  var $toolbar = $('.book-header');
  var $title = $toolbar.find('h1');

  // Build class name
  var positionClass = 'pull-' + opts.position;

  // Create button
  var $btn = $('<a>', {
    'class': 'btn',
    'text': opts.text ? ' ' + opts.text : '',
    'aria-label': opts.label,
    'href': '#'
  });

  // Bind click
  $btn.click(opts.onClick);

  // Prepend icon
  if (opts.icon) {
    $('<i>', {
      'class': opts.icon
    }).prependTo($btn);
  }

  // Prepare dropdown
  if (opts.dropdown) {
    var $container = $('<div>', {
      'class': 'dropdown ' + positionClass + ' ' + opts.className
    });

    // Add button to container
    $btn.addClass('toggle-dropdown');
    $container.append($btn);

    // Create inner menu
    var $menu = createDropdownMenu(opts.dropdown);

    // Menu position
    $menu.addClass('dropdown-' + (opts.position == 'right' ? 'left' : 'right'));

    $container.append($menu);
    $result = $container;
  } else {
    $btn.addClass(positionClass);
    $btn.addClass(opts.className);
    $result = $btn;
  }

  $result.addClass('js-toolbar-action');

  if ($.isNumeric(opts.index) && opts.index >= 0) {
    insertAt($toolbar, '.btn, .dropdown, h1', opts.index, $result);
  } else {
    $result.insertBefore($title);
  }
}

// Update all buttons
function updateAllButtons() {
  $('.js-toolbar-action').remove();
  buttons.forEach(updateButton);
}

// 当页面更改时，重置按钮
lsbook.events.on('page.change', function () {
  updateAllButtons();
});
var toolbar = {
  // 在工具栏中创建一个新按钮
  createButton: function (opts) {
    opts = $.extend({
      // Aria label for the button
      label: '',

      // Icon to show
      icon: '',

      // Inner text
      text: '',

      // Right or left position
      position: 'left',

      // Other class name to add to the button
      className: '',

      // Triggered when user click on the button
      onClick: defaultOnClick,

      // Button is a dropdown
      dropdown: null,

      // Position in the toolbar
      index: null,

      // Button id for removal
      id: generateId()
    }, opts || {});

    buttons.push(opts);
    updateButton(opts);

    return opts.id;
  },
  // 删除提供其id的按钮
  removeButton: function (id) {
    buttons = $.grep(buttons, function (button) {
      return button.id != id;
    });

    updateAllButtons();
  },
  // 从id数组中删除多个按钮
  removeButtons: function (ids) {
    buttons = $.grep(buttons, function (button) {
      return ids.indexOf(button.id) == -1;
    });

    updateAllButtons();
  }
};

lsbook.events.on('start', function () {
  // Init sidebar
  sidebar.init();

  // Init keyboard
  keyboard.init();

  // Bind dropdown
  dropdown.init();

  // Init navigation
  navigation.init();

  // Add action to toggle sidebar
  toolbar.createButton({
    index: 0,
    icon: 'fa fa-align-justify',
    onClick: function (e) {
      e.preventDefault();
      sidebar.toggle();
    }
  });
});

lsbook.keyboard = keyboard;
lsbook.navigation = navigation;
lsbook.sidebar = sidebar;
lsbook.toolbar = toolbar;
// end_theme_index

// 组件
function loadFiles(files, fn) {
  if (!files.length) {
    files = [];
  }
  var head = document.head || document.getElementsByTagName('head')[0];

  function loadFile(index) {
    if (files.length > index) {
      var fileref = document.createElement('script');
      fileref.setAttribute("type", "text/javascript");
      fileref.setAttribute("src", files[index]);
      head.appendChild(fileref);
      index = index + 1; // 用于调用回调函数
      fileref.onload = function () {
        loadFile(index);
      }
    } else if (fn) {
      fn();
    }
  }

  loadFile(0);
}

/**
 * mermaid 流程图渲染
 */
lsbook.events.bind('page.change', function () {
  function _init() {
    if (typeof mermaid != "undefined") {
      var config = {
        startOnLoad: true,
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true
        },
        theme: 'forest'
      };
      console.log("mermaid config");
      mermaid.initialize(config);
      console.log("mermaid init");
      mermaid.init();
    }
  }

  if (typeof mermaid == "undefined" && typeof lsbook.state.js.mermaid != "undefined") {
    loadFiles(lsbook.state.js.mermaid, _init);
  } else {
    _init();
  }
});

/**
 * 隐藏答案分块
 */
lsbook.events.bind("page.change", function () {
  $('.section').each(function () {
    $(this).click(function () {
      var target = $(this).attr('target');
      var show = $(this).hasClass("sec-show");
      $(this).toggleClass("sec-show", !show);
      $(this).children().toggleClass("fa-angle-up", !show).toggleClass("fa-angle-down", show);
      $('#' + target).toggleClass("in", !show).toggleClass("collapse", show);
    });
  });
});

/**
 * 划过显示
 */
lsbook.events.bind("page.change", function () {
  $('.spoiler').hover(function () {
    $(this).addClass('hover');
  }, function () {
    $(this).removeClass('hover');
  });
});

/**
 * 章节扩展
 */
function ExpandableChapters() {
  var TOGGLE_CLASSNAME = 'expanded',
    CHAPTER = '.chapter',
    ARTICLES = '.articles',
    TRIGGER_TEMPLATE = '<i class="exc-trigger fa"></i>',
    LS_NAMESPACE = 'expChapters';
  var toggle = function ($chapter) {
    if ($chapter.hasClass('expanded')) {
      collapse($chapter);
    } else {
      expand($chapter);
    }
  };
  var collapse = function ($chapter) {
    if ($chapter.length && $chapter.hasClass(TOGGLE_CLASSNAME)) {
      $chapter.removeClass(TOGGLE_CLASSNAME);
      lsItem($chapter);
    }
  };
  var expand = function ($chapter) {
    if ($chapter.length && !$chapter.hasClass(TOGGLE_CLASSNAME)) {
      $chapter.addClass(TOGGLE_CLASSNAME);
      lsItem($chapter);
    }
  };
  var lsItem = function () {
    var map = JSON.parse(sessionStorage.getItem(LS_NAMESPACE)) || {};
    if (arguments.length) {
      var $chapters = arguments[0];
      $chapters.each(function (index, element) {
        var level = $(this).data('level');
        map[level] = $(this).hasClass(TOGGLE_CLASSNAME);
      });
      sessionStorage.setItem(LS_NAMESPACE, JSON.stringify(map));
    } else {
      return $(CHAPTER).map(function (index, element) {
        if (map[$(this).data('level')]) {
          return this;
        }
      });
    }
  };
  lsbook.events.bind('page.change', function () {
    // 将触发器元素添加到每个ARTICLES父元素并绑定事件
    $(ARTICLES)
      .parent(CHAPTER)
      .children('a, span')
      .append(
        $(TRIGGER_TEMPLATE)
          .on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggle($(e.target).closest(CHAPTER));
          })
      );
    // hacky解决方案，使跨可点击时，结合使用“ungrey”插件
    $(CHAPTER + ' > span')
      .on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggle($(e.target).closest(CHAPTER));
      });
    expand(lsItem());
    // 展开当前选定的章节与它的父母
    var activeChapter = $(CHAPTER + '.active');
    expand(activeChapter);
    expand(activeChapter.parents(CHAPTER));
  });
}

ExpandableChapters();

/**
 * Github 按钮
 */
lsbook.events.bind('start', function (e, config) {
  var githubURL = config.github_url;
  if (githubURL) {
    lsbook.toolbar.createButton({
      icon: 'fa fa-github',
      label: 'GitHub',
      position: 'right',
      onClick: function () {
        window.open(githubURL);
      }
    });
  }
});

/**
 * 数学公式刷新
 */
lsbook.events.bind('page.change', function () {
  function _init() {
    if (typeof renderMathInElement != "undefined") {
      renderMathInElement(document.body, {
        displayMode: false
      });
    }
  }

  if (typeof renderMathInElement == "undefined" && typeof lsbook.state.js.katex != "undefined") {
    loadFiles(lsbook.state.js.katex, _init);
  } else {
    _init();
  }
});

/**
 * Prism渲染
 */
lsbook.events.bind('page.change', function () {
  function _init() {
    if (typeof Prism != "undefined") {
      Prism.highlightAll();
    }
  }

  if (typeof Prism == "undefined" && typeof lsbook.state.js.prism != "undefined") {
    loadFiles(lsbook.state.js.prism, _init);
  } else {
    _init();
  }
});

/**
 * 搜索
 */
function search() {
  var MAX_DESCRIPTION_SIZE = 500;
  var state = lsbook.state;
  var INDEX_DATA = {};
  var usePushState = (typeof window.history.pushState !== 'undefined');

  // DOM Elements
  var $body = $('body');
  var $bookSearchResults;
  var $searchList;
  var $searchTitle;
  var $searchResultsCount;
  var $searchQuery;

  // Throttle search
  function throttle(fn, wait) {
    var timeout;

    return function () {
      var ctx = this;
      var args = arguments;
      if (!timeout) {
        timeout = setTimeout(function () {
          timeout = null;
          fn.apply(ctx, args);
        }, wait);
      }
    };
  }

  function displayResults(res) {
    $bookSearchResults = $('#book-search-results');
    $searchList = $bookSearchResults.find('.search-results-list');
    $searchTitle = $bookSearchResults.find('.search-results-title');
    $searchResultsCount = $searchTitle.find('.search-results-count');
    $searchQuery = $searchTitle.find('.search-query');

    $bookSearchResults.addClass('open');

    var noResults = res.count === 0;
    $bookSearchResults.toggleClass('no-results', noResults);

    // Clear old results
    $searchList.empty();

    // Display title for research
    $searchResultsCount.text(res.count);
    $searchQuery.text(res.query);

    // Create an <li> element for each result
    res.results.forEach(function (item) {
      var $li = $('<li>', {
        'class': 'search-results-item'
      });

      var $title = $('<h3>');

      var $link = $('<a>', {
        'href': lsbook.state.basePath + '/' + item.url + '?h=' + encodeURIComponent(res.query),
        'text': item.title,
        'data-is-search': 1
      });

      if ($link[0].href.split('?')[0] === window.location.href.split('?')[0]) {
        $link[0].setAttribute('data-need-reload', 1);
      }

      var content = item.body.trim();
      if (content.length > MAX_DESCRIPTION_SIZE) {
        content = content + '...';
      }
      var $content = $('<p>').html(content);

      $link.appendTo($title);
      $title.appendTo($li);
      $content.appendTo($li);
      $li.appendTo($searchList);
    });
    $('.body-inner').scrollTop(0);
  }

  function escapeRegExp(keyword) {
    // escape regexp prevserve word
    return String(keyword).replace(/([-.*+?^${}()|[\]/\\])/g, '\\$1');
  }

  function query(originKeyword) {
    if (originKeyword == null || originKeyword.trim() === '') return;
    var keyword;
    var results = [];
    var index = -1;
    for (var page in INDEX_DATA) {
      var store = INDEX_DATA[page];
      keyword = originKeyword.toLowerCase(); // ignore case
      var hit = false;
      if (store.keywords && ~store.keywords.split(/\s+/).indexOf(keyword.split(':').pop())) {
        if (/.:./.test(keyword)) {
          keyword = keyword.split(':').slice(0, -1).join(':');
        } else {
          hit = true;
        }
      }
      var keywordRe = new RegExp('(' + escapeRegExp(keyword) + ')', 'gi');
      if (
        hit || ~(index = store.body.toLowerCase().indexOf(keyword))
      ) {
        results.push({
          url: page,
          title: store.title,
          body: store.body.substr(Math.max(0, index - 50), MAX_DESCRIPTION_SIZE)
            .replace(/^[^\s,.]+./, '').replace(/(..*)[\s,.].*/, '$1') // prevent break word
            .replace(keywordRe, '<span class="search-highlight-keyword">$1</span>')
        });
      }
    }
    displayResults({
      count: results.length,
      query: keyword,
      results: results
    });
  }

  function launchSearch(keyword) {
    // 添加加载类
    $body.addClass('with-search');
    $body.addClass('search-loading');

    function doSearch() {
      query(keyword);
      $body.removeClass('search-loading');
    }

    throttle(doSearch)();
  }

  function closeSearch() {
    $body.removeClass('with-search');
    $('#book-search-results').removeClass('open');
  }

  function bindSearch() {
    // Bind DOM
    var $body = $('body');

    // 根据输入内容启动查询
    function handleUpdate() {
      var $searchInput = $('#book-search-input input');
      var keyword = $searchInput.val();

      if (keyword.length === 0) {
        closeSearch();
        $('.page-inner').unmark();
      } else {
        launchSearch(keyword);
      }
    }

    $body.on('keyup', '#book-search-input input', function (e) {
      if (e.keyCode === 13) {
        if (usePushState) {
          var uri = updateQueryString('q', $(this).val());
          window.history.pushState({
            path: uri
          }, null, uri);
        }
      }
      handleUpdate();
    });

    // Push to history on blur
    $body.on('blur', '#book-search-input input', function (e) {
      // 更新历史状态
      if (usePushState) {
        var uri = updateQueryString('q', $(this).val());
        window.history.pushState({
          path: uri
        }, null, uri);
      }
    });
  }

  lsbook.events.on('start', function () {
    bindSearch();
    $.getJSON(state.basePath + '/search_plus_index.json').then(function (data) {
      INDEX_DATA = data;
      showResult();
      closeSearch();
    });
  });

  var markConfig = {
    'ignoreJoiners': true,
    'acrossElements': true,
    'separateWordSearch': false
  };
  // 强调
  var highLightPageInner = function (keyword) {
    var pageInner = $('.page-inner');
    if (/(?:(.+)?\:)(.+)/.test(keyword)) {
      pageInner.mark(RegExp.$1, markConfig);
    }
    pageInner.mark(keyword, markConfig);

    setTimeout(function () {
      var mark = $('mark[data-markjs="true"]');
      if (mark.length) {
        mark[0].scrollIntoView();
      }
    }, 100);
  };

  function showResult() {
    var keyword, type;
    if (/\b(q|h)=([^&]+)/.test(window.location.search)) {
      type = RegExp.$1;
      keyword = decodeURIComponent(RegExp.$2);
      if (type === 'q') {
        launchSearch(keyword);
      } else {
        highLightPageInner(keyword);
      }
      $('#book-search-input input').val(keyword);
    }
  }

  lsbook.events.on('page.change', showResult);

  function updateQueryString(key, value) {
    value = encodeURIComponent(value);

    var url = window.location.href.replace(/([?&])(?:q|h)=([^&]+)(&|$)/, function (all, pre, value, end) {
      if (end === '&') {
        return pre;
      }
      return '';
    });
    var re = new RegExp('([?&])' + key + '=.*?(&|#|$)(.*)', 'gi');
    var hash;

    if (re.test(url)) {
      if (typeof value !== 'undefined' && value !== null) {
        return url.replace(re, '$1' + key + '=' + value + '$2$3');
      } else {
        hash = url.split('#');
        url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
        if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
          url += '#' + hash[1];
        }
        return url;
      }
    } else {
      if (typeof value !== 'undefined' && value !== null) {
        var separator = url.indexOf('?') !== -1 ? '&' : '?';
        hash = url.split('#');
        url = hash[0] + separator + key + '=' + value;
        if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
          url += '#' + hash[1];
        }
        return url;
      } else {
        return url;
      }
    }
  }

  window.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' && e.target.getAttribute('data-need-reload')) {
      setTimeout(function () {
        window.location.reload();
      }, 100);
    }
  }, true);
}

search();
