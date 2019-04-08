(function () {
    function r(e, n, t) {
        function o(i, f) {
            if (!n[i]) {
                if (!e[i]) {
                    var c = "function" == typeof require && require;
                    if (!f && c) return c(i, !0);
                    if (u) return u(i, !0);
                    var a = new Error("Cannot find module '" + i + "'");
                    throw a.code = "MODULE_NOT_FOUND", a
                }
                var p = n[i] = {exports: {}};
                e[i][0].call(p.exports, function (r) {
                    var n = e[i][1][r];
                    return o(n || r)
                }, p, p.exports, r, e, n, t)
            }
            return n[i].exports
        }

        for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
        return o
    }

    return r
})()({
    1: [function (require, module, exports) {
        (function (global) {
            /*! https://mths.be/punycode v1.4.1 by @mathias */
            ;(function (root) {

                /** Detect free variables */
                var freeExports = typeof exports == 'object' && exports &&
                    !exports.nodeType && exports;
                var freeModule = typeof module == 'object' && module &&
                    !module.nodeType && module;
                var freeGlobal = typeof global == 'object' && global;
                if (
                    freeGlobal.global === freeGlobal ||
                    freeGlobal.window === freeGlobal ||
                    freeGlobal.self === freeGlobal
                ) {
                    root = freeGlobal;
                }

                /**
                 * The `punycode` object.
                 * @name punycode
                 * @type Object
                 */
                var punycode,

                    /** Highest positive signed 32-bit float value */
                    maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

                    /** Bootstring parameters */
                    base = 36,
                    tMin = 1,
                    tMax = 26,
                    skew = 38,
                    damp = 700,
                    initialBias = 72,
                    initialN = 128, // 0x80
                    delimiter = '-', // '\x2D'

                    /** Regular expressions */
                    regexPunycode = /^xn--/,
                    regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
                    regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

                    /** Error messages */
                    errors = {
                        'overflow': 'Overflow: input needs wider integers to process',
                        'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
                        'invalid-input': 'Invalid input'
                    },

                    /** Convenience shortcuts */
                    baseMinusTMin = base - tMin,
                    floor = Math.floor,
                    stringFromCharCode = String.fromCharCode,

                    /** Temporary variable */
                    key;

                /*--------------------------------------------------------------------------*/

                /**
                 * A generic error utility function.
                 * @private
                 * @param {String} type The error type.
                 * @returns {Error} Throws a `RangeError` with the applicable error message.
                 */
                function error(type) {
                    throw new RangeError(errors[type]);
                }

                /**
                 * A generic `Array#map` utility function.
                 * @private
                 * @param {Array} array The array to iterate over.
                 * @param {Function} callback The function that gets called for every array
                 * item.
                 * @returns {Array} A new array of values returned by the callback function.
                 */
                function map(array, fn) {
                    var length = array.length;
                    var result = [];
                    while (length--) {
                        result[length] = fn(array[length]);
                    }
                    return result;
                }

                /**
                 * A simple `Array#map`-like wrapper to work with domain name strings or email
                 * addresses.
                 * @private
                 * @param {String} domain The domain name or email address.
                 * @param {Function} callback The function that gets called for every
                 * character.
                 * @returns {Array} A new string of characters returned by the callback
                 * function.
                 */
                function mapDomain(string, fn) {
                    var parts = string.split('@');
                    var result = '';
                    if (parts.length > 1) {
                        // In email addresses, only the domain name should be punycoded. Leave
                        // the local part (i.e. everything up to `@`) intact.
                        result = parts[0] + '@';
                        string = parts[1];
                    }
                    // Avoid `split(regex)` for IE8 compatibility. See #17.
                    string = string.replace(regexSeparators, '\x2E');
                    var labels = string.split('.');
                    var encoded = map(labels, fn).join('.');
                    return result + encoded;
                }

                /**
                 * Creates an array containing the numeric code points of each Unicode
                 * character in the string. While JavaScript uses UCS-2 internally,
                 * this function will convert a pair of surrogate halves (each of which
                 * UCS-2 exposes as separate characters) into a single code point,
                 * matching UTF-16.
                 * @see `punycode.ucs2.encode`
                 * @see <https://mathiasbynens.be/notes/javascript-encoding>
                 * @memberOf punycode.ucs2
                 * @name decode
                 * @param {String} string The Unicode input string (UCS-2).
                 * @returns {Array} The new array of code points.
                 */
                function ucs2decode(string) {
                    var output = [],
                        counter = 0,
                        length = string.length,
                        value,
                        extra;
                    while (counter < length) {
                        value = string.charCodeAt(counter++);
                        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
                            // high surrogate, and there is a next character
                            extra = string.charCodeAt(counter++);
                            if ((extra & 0xFC00) == 0xDC00) { // low surrogate
                                output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                            } else {
                                // unmatched surrogate; only append this code unit, in case the next
                                // code unit is the high surrogate of a surrogate pair
                                output.push(value);
                                counter--;
                            }
                        } else {
                            output.push(value);
                        }
                    }
                    return output;
                }

                /**
                 * Creates a string based on an array of numeric code points.
                 * @see `punycode.ucs2.decode`
                 * @memberOf punycode.ucs2
                 * @name encode
                 * @param {Array} codePoints The array of numeric code points.
                 * @returns {String} The new Unicode string (UCS-2).
                 */
                function ucs2encode(array) {
                    return map(array, function (value) {
                        var output = '';
                        if (value > 0xFFFF) {
                            value -= 0x10000;
                            output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
                            value = 0xDC00 | value & 0x3FF;
                        }
                        output += stringFromCharCode(value);
                        return output;
                    }).join('');
                }

                /**
                 * Converts a basic code point into a digit/integer.
                 * @see `digitToBasic()`
                 * @private
                 * @param {Number} codePoint The basic numeric code point value.
                 * @returns {Number} The numeric value of a basic code point (for use in
                 * representing integers) in the range `0` to `base - 1`, or `base` if
                 * the code point does not represent a value.
                 */
                function basicToDigit(codePoint) {
                    if (codePoint - 48 < 10) {
                        return codePoint - 22;
                    }
                    if (codePoint - 65 < 26) {
                        return codePoint - 65;
                    }
                    if (codePoint - 97 < 26) {
                        return codePoint - 97;
                    }
                    return base;
                }

                /**
                 * Converts a digit/integer into a basic code point.
                 * @see `basicToDigit()`
                 * @private
                 * @param {Number} digit The numeric value of a basic code point.
                 * @returns {Number} The basic code point whose value (when used for
                 * representing integers) is `digit`, which needs to be in the range
                 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
                 * used; else, the lowercase form is used. The behavior is undefined
                 * if `flag` is non-zero and `digit` has no uppercase form.
                 */
                function digitToBasic(digit, flag) {
                    //  0..25 map to ASCII a..z or A..Z
                    // 26..35 map to ASCII 0..9
                    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
                }

                /**
                 * Bias adaptation function as per section 3.4 of RFC 3492.
                 * https://tools.ietf.org/html/rfc3492#section-3.4
                 * @private
                 */
                function adapt(delta, numPoints, firstTime) {
                    var k = 0;
                    delta = firstTime ? floor(delta / damp) : delta >> 1;
                    delta += floor(delta / numPoints);
                    for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
                        delta = floor(delta / baseMinusTMin);
                    }
                    return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
                }

                /**
                 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
                 * symbols.
                 * @memberOf punycode
                 * @param {String} input The Punycode string of ASCII-only symbols.
                 * @returns {String} The resulting string of Unicode symbols.
                 */
                function decode(input) {
                    // Don't use UCS-2
                    var output = [],
                        inputLength = input.length,
                        out,
                        i = 0,
                        n = initialN,
                        bias = initialBias,
                        basic,
                        j,
                        index,
                        oldi,
                        w,
                        k,
                        digit,
                        t,
                        /** Cached calculation results */
                        baseMinusT;

                    // Handle the basic code points: let `basic` be the number of input code
                    // points before the last delimiter, or `0` if there is none, then copy
                    // the first basic code points to the output.

                    basic = input.lastIndexOf(delimiter);
                    if (basic < 0) {
                        basic = 0;
                    }

                    for (j = 0; j < basic; ++j) {
                        // if it's not a basic code point
                        if (input.charCodeAt(j) >= 0x80) {
                            error('not-basic');
                        }
                        output.push(input.charCodeAt(j));
                    }

                    // Main decoding loop: start just after the last delimiter if any basic code
                    // points were copied; start at the beginning otherwise.

                    for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

                        // `index` is the index of the next character to be consumed.
                        // Decode a generalized variable-length integer into `delta`,
                        // which gets added to `i`. The overflow checking is easier
                        // if we increase `i` as we go, then subtract off its starting
                        // value at the end to obtain `delta`.
                        for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

                            if (index >= inputLength) {
                                error('invalid-input');
                            }

                            digit = basicToDigit(input.charCodeAt(index++));

                            if (digit >= base || digit > floor((maxInt - i) / w)) {
                                error('overflow');
                            }

                            i += digit * w;
                            t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

                            if (digit < t) {
                                break;
                            }

                            baseMinusT = base - t;
                            if (w > floor(maxInt / baseMinusT)) {
                                error('overflow');
                            }

                            w *= baseMinusT;

                        }

                        out = output.length + 1;
                        bias = adapt(i - oldi, out, oldi == 0);

                        // `i` was supposed to wrap around from `out` to `0`,
                        // incrementing `n` each time, so we'll fix that now:
                        if (floor(i / out) > maxInt - n) {
                            error('overflow');
                        }

                        n += floor(i / out);
                        i %= out;

                        // Insert `n` at position `i` of the output
                        output.splice(i++, 0, n);

                    }

                    return ucs2encode(output);
                }

                /**
                 * Converts a string of Unicode symbols (e.g. a domain name label) to a
                 * Punycode string of ASCII-only symbols.
                 * @memberOf punycode
                 * @param {String} input The string of Unicode symbols.
                 * @returns {String} The resulting Punycode string of ASCII-only symbols.
                 */
                function encode(input) {
                    var n,
                        delta,
                        handledCPCount,
                        basicLength,
                        bias,
                        j,
                        m,
                        q,
                        k,
                        t,
                        currentValue,
                        output = [],
                        /** `inputLength` will hold the number of code points in `input`. */
                        inputLength,
                        /** Cached calculation results */
                        handledCPCountPlusOne,
                        baseMinusT,
                        qMinusT;

                    // Convert the input in UCS-2 to Unicode
                    input = ucs2decode(input);

                    // Cache the length
                    inputLength = input.length;

                    // Initialize the state
                    n = initialN;
                    delta = 0;
                    bias = initialBias;

                    // Handle the basic code points
                    for (j = 0; j < inputLength; ++j) {
                        currentValue = input[j];
                        if (currentValue < 0x80) {
                            output.push(stringFromCharCode(currentValue));
                        }
                    }

                    handledCPCount = basicLength = output.length;

                    // `handledCPCount` is the number of code points that have been handled;
                    // `basicLength` is the number of basic code points.

                    // Finish the basic string - if it is not empty - with a delimiter
                    if (basicLength) {
                        output.push(delimiter);
                    }

                    // Main encoding loop:
                    while (handledCPCount < inputLength) {

                        // All non-basic code points < n have been handled already. Find the next
                        // larger one:
                        for (m = maxInt, j = 0; j < inputLength; ++j) {
                            currentValue = input[j];
                            if (currentValue >= n && currentValue < m) {
                                m = currentValue;
                            }
                        }

                        // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
                        // but guard against overflow
                        handledCPCountPlusOne = handledCPCount + 1;
                        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                            error('overflow');
                        }

                        delta += (m - n) * handledCPCountPlusOne;
                        n = m;

                        for (j = 0; j < inputLength; ++j) {
                            currentValue = input[j];

                            if (currentValue < n && ++delta > maxInt) {
                                error('overflow');
                            }

                            if (currentValue == n) {
                                // Represent delta as a generalized variable-length integer
                                for (q = delta, k = base; /* no condition */; k += base) {
                                    t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                                    if (q < t) {
                                        break;
                                    }
                                    qMinusT = q - t;
                                    baseMinusT = base - t;
                                    output.push(
                                        stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                                    );
                                    q = floor(qMinusT / baseMinusT);
                                }

                                output.push(stringFromCharCode(digitToBasic(q, 0)));
                                bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                                delta = 0;
                                ++handledCPCount;
                            }
                        }

                        ++delta;
                        ++n;

                    }
                    return output.join('');
                }

                /**
                 * Converts a Punycode string representing a domain name or an email address
                 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
                 * it doesn't matter if you call it on a string that has already been
                 * converted to Unicode.
                 * @memberOf punycode
                 * @param {String} input The Punycoded domain name or email address to
                 * convert to Unicode.
                 * @returns {String} The Unicode representation of the given Punycode
                 * string.
                 */
                function toUnicode(input) {
                    return mapDomain(input, function (string) {
                        return regexPunycode.test(string)
                            ? decode(string.slice(4).toLowerCase())
                            : string;
                    });
                }

                /**
                 * Converts a Unicode string representing a domain name or an email address to
                 * Punycode. Only the non-ASCII parts of the domain name will be converted,
                 * i.e. it doesn't matter if you call it with a domain that's already in
                 * ASCII.
                 * @memberOf punycode
                 * @param {String} input The domain name or email address to convert, as a
                 * Unicode string.
                 * @returns {String} The Punycode representation of the given domain name or
                 * email address.
                 */
                function toASCII(input) {
                    return mapDomain(input, function (string) {
                        return regexNonASCII.test(string)
                            ? 'xn--' + encode(string)
                            : string;
                    });
                }

                /*--------------------------------------------------------------------------*/

                /** Define the public API */
                punycode = {
                    /**
                     * A string representing the current Punycode.js version number.
                     * @memberOf punycode
                     * @type String
                     */
                    'version': '1.4.1',
                    /**
                     * An object of methods to convert from JavaScript's internal character
                     * representation (UCS-2) to Unicode code points, and back.
                     * @see <https://mathiasbynens.be/notes/javascript-encoding>
                     * @memberOf punycode
                     * @type Object
                     */
                    'ucs2': {
                        'decode': ucs2decode,
                        'encode': ucs2encode
                    },
                    'decode': decode,
                    'encode': encode,
                    'toASCII': toASCII,
                    'toUnicode': toUnicode
                };

                /** Expose `punycode` */
                // Some AMD build optimizers, like r.js, check for specific condition patterns
                // like the following:
                if (
                    typeof define == 'function' &&
                    typeof define.amd == 'object' &&
                    define.amd
                ) {
                    define('punycode', function () {
                        return punycode;
                    });
                } else if (freeExports && freeModule) {
                    if (module.exports == freeExports) {
                        // in Node.js, io.js, or RingoJS v0.8.0+
                        freeModule.exports = punycode;
                    } else {
                        // in Narwhal or RingoJS v0.7.0-
                        for (key in punycode) {
                            punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
                        }
                    }
                } else {
                    // in Rhino or a web browser
                    root.punycode = punycode;
                }

            }(this));

        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}],
    2: [function (require, module, exports) {
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
        function hasOwnProperty(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        }

        module.exports = function (qs, sep, eq, options) {
            sep = sep || '&';
            eq = eq || '=';
            var obj = {};

            if (typeof qs !== 'string' || qs.length === 0) {
                return obj;
            }

            var regexp = /\+/g;
            qs = qs.split(sep);

            var maxKeys = 1000;
            if (options && typeof options.maxKeys === 'number') {
                maxKeys = options.maxKeys;
            }

            var len = qs.length;
            // maxKeys <= 0 means that we should not limit keys count
            if (maxKeys > 0 && len > maxKeys) {
                len = maxKeys;
            }

            for (var i = 0; i < len; ++i) {
                var x = qs[i].replace(regexp, '%20'),
                    idx = x.indexOf(eq),
                    kstr, vstr, k, v;

                if (idx >= 0) {
                    kstr = x.substr(0, idx);
                    vstr = x.substr(idx + 1);
                } else {
                    kstr = x;
                    vstr = '';
                }

                k = decodeURIComponent(kstr);
                v = decodeURIComponent(vstr);

                if (!hasOwnProperty(obj, k)) {
                    obj[k] = v;
                } else if (isArray(obj[k])) {
                    obj[k].push(v);
                } else {
                    obj[k] = [obj[k], v];
                }
            }

            return obj;
        };

        var isArray = Array.isArray || function (xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
        };

    }, {}],
    3: [function (require, module, exports) {
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        'use strict';

        var stringifyPrimitive = function (v) {
            switch (typeof v) {
                case 'string':
                    return v;

                case 'boolean':
                    return v ? 'true' : 'false';

                case 'number':
                    return isFinite(v) ? v : '';

                default:
                    return '';
            }
        };

        module.exports = function (obj, sep, eq, name) {
            sep = sep || '&';
            eq = eq || '=';
            if (obj === null) {
                obj = undefined;
            }

            if (typeof obj === 'object') {
                return map(objectKeys(obj), function (k) {
                    var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
                    if (isArray(obj[k])) {
                        return map(obj[k], function (v) {
                            return ks + encodeURIComponent(stringifyPrimitive(v));
                        }).join(sep);
                    } else {
                        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
                    }
                }).join(sep);

            }

            if (!name) return '';
            return encodeURIComponent(stringifyPrimitive(name)) + eq +
                encodeURIComponent(stringifyPrimitive(obj));
        };

        var isArray = Array.isArray || function (xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
        };

        function map(xs, f) {
            if (xs.map) return xs.map(f);
            var res = [];
            for (var i = 0; i < xs.length; i++) {
                res.push(f(xs[i], i));
            }
            return res;
        }

        var objectKeys = Object.keys || function (obj) {
            var res = [];
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
            }
            return res;
        };

    }, {}],
    4: [function (require, module, exports) {
        'use strict';

        exports.decode = exports.parse = require('./decode');
        exports.encode = exports.stringify = require('./encode');

    }, {"./decode": 2, "./encode": 3}],
    5: [function (require, module, exports) {
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        'use strict';

        var punycode = require('punycode');
        var util = require('./util');

        exports.parse = urlParse;
        exports.resolve = urlResolve;
        exports.resolveObject = urlResolveObject;
        exports.format = urlFormat;

        exports.Url = Url;

        function Url() {
            this.protocol = null;
            this.slashes = null;
            this.auth = null;
            this.host = null;
            this.port = null;
            this.hostname = null;
            this.hash = null;
            this.search = null;
            this.query = null;
            this.pathname = null;
            this.path = null;
            this.href = null;
        }

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
        var protocolPattern = /^([a-z0-9.+-]+:)/i,
            portPattern = /:[0-9]*$/,

            // Special case for a simple path URL
            simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

            // RFC 2396: characters reserved for delimiting URLs.
            // We actually just auto-escape these.
            delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

            // RFC 2396: characters not allowed for various reasons.
            unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

            // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
            autoEscape = ['\''].concat(unwise),
            // Characters that are never ever allowed in a hostname.
            // Note that any invalid chars are also handled, but these
            // are the ones that are *expected* to be seen, so we fast-path
            // them.
            nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
            hostEndingChars = ['/', '?', '#'],
            hostnameMaxLen = 255,
            hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
            hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
            // protocols that can allow "unsafe" and "unwise" chars.
            unsafeProtocol = {
                'javascript': true,
                'javascript:': true
            },
            // protocols that never have a hostname.
            hostlessProtocol = {
                'javascript': true,
                'javascript:': true
            },
            // protocols that always contain a // bit.
            slashedProtocol = {
                'http': true,
                'https': true,
                'ftp': true,
                'gopher': true,
                'file': true,
                'http:': true,
                'https:': true,
                'ftp:': true,
                'gopher:': true,
                'file:': true
            },
            querystring = require('querystring');

        function urlParse(url, parseQueryString, slashesDenoteHost) {
            if (url && util.isObject(url) && url instanceof Url) return url;

            var u = new Url;
            u.parse(url, parseQueryString, slashesDenoteHost);
            return u;
        }

        Url.prototype.parse = function (url, parseQueryString, slashesDenoteHost) {
            if (!util.isString(url)) {
                throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
            }

            // Copy chrome, IE, opera backslash-handling behavior.
            // Back slashes before the query string get converted to forward slashes
            // See: https://code.google.com/p/chromium/issues/detail?id=25916
            var queryIndex = url.indexOf('?'),
                splitter =
                    (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
                uSplit = url.split(splitter),
                slashRegex = /\\/g;
            uSplit[0] = uSplit[0].replace(slashRegex, '/');
            url = uSplit.join(splitter);

            var rest = url;

            // trim before proceeding.
            // This is to support parse stuff like "  http://foo.com  \n"
            rest = rest.trim();

            if (!slashesDenoteHost && url.split('#').length === 1) {
                // Try fast path regexp
                var simplePath = simplePathPattern.exec(rest);
                if (simplePath) {
                    this.path = rest;
                    this.href = rest;
                    this.pathname = simplePath[1];
                    if (simplePath[2]) {
                        this.search = simplePath[2];
                        if (parseQueryString) {
                            this.query = querystring.parse(this.search.substr(1));
                        } else {
                            this.query = this.search.substr(1);
                        }
                    } else if (parseQueryString) {
                        this.search = '';
                        this.query = {};
                    }
                    return this;
                }
            }

            var proto = protocolPattern.exec(rest);
            if (proto) {
                proto = proto[0];
                var lowerProto = proto.toLowerCase();
                this.protocol = lowerProto;
                rest = rest.substr(proto.length);
            }

            // figure out if it's got a host
            // user@server is *always* interpreted as a hostname, and url
            // resolution will treat //foo/bar as host=foo,path=bar because that's
            // how the browser resolves relative URLs.
            if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
                var slashes = rest.substr(0, 2) === '//';
                if (slashes && !(proto && hostlessProtocol[proto])) {
                    rest = rest.substr(2);
                    this.slashes = true;
                }
            }

            if (!hostlessProtocol[proto] &&
                (slashes || (proto && !slashedProtocol[proto]))) {

                // there's a hostname.
                // the first instance of /, ?, ;, or # ends the host.
                //
                // If there is an @ in the hostname, then non-host chars *are* allowed
                // to the left of the last @ sign, unless some host-ending character
                // comes *before* the @-sign.
                // URLs are obnoxious.
                //
                // ex:
                // http://a@b@c/ => user:a@b host:c
                // http://a@b?@c => user:a host:c path:/?@c

                // v0.12 TODO(isaacs): This is not quite how Chrome does things.
                // Review our test case against browsers more comprehensively.

                // find the first instance of any hostEndingChars
                var hostEnd = -1;
                for (var i = 0; i < hostEndingChars.length; i++) {
                    var hec = rest.indexOf(hostEndingChars[i]);
                    if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                        hostEnd = hec;
                }

                // at this point, either we have an explicit point where the
                // auth portion cannot go past, or the last @ char is the decider.
                var auth, atSign;
                if (hostEnd === -1) {
                    // atSign can be anywhere.
                    atSign = rest.lastIndexOf('@');
                } else {
                    // atSign must be in auth portion.
                    // http://a@b/c@d => host:b auth:a path:/c@d
                    atSign = rest.lastIndexOf('@', hostEnd);
                }

                // Now we have a portion which is definitely the auth.
                // Pull that off.
                if (atSign !== -1) {
                    auth = rest.slice(0, atSign);
                    rest = rest.slice(atSign + 1);
                    this.auth = decodeURIComponent(auth);
                }

                // the host is the remaining to the left of the first non-host char
                hostEnd = -1;
                for (var i = 0; i < nonHostChars.length; i++) {
                    var hec = rest.indexOf(nonHostChars[i]);
                    if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                        hostEnd = hec;
                }
                // if we still have not hit it, then the entire thing is a host.
                if (hostEnd === -1)
                    hostEnd = rest.length;

                this.host = rest.slice(0, hostEnd);
                rest = rest.slice(hostEnd);

                // pull out port.
                this.parseHost();

                // we've indicated that there is a hostname,
                // so even if it's empty, it has to be present.
                this.hostname = this.hostname || '';

                // if hostname begins with [ and ends with ]
                // assume that it's an IPv6 address.
                var ipv6Hostname = this.hostname[0] === '[' &&
                    this.hostname[this.hostname.length - 1] === ']';

                // validate a little.
                if (!ipv6Hostname) {
                    var hostparts = this.hostname.split(/\./);
                    for (var i = 0, l = hostparts.length; i < l; i++) {
                        var part = hostparts[i];
                        if (!part) continue;
                        if (!part.match(hostnamePartPattern)) {
                            var newpart = '';
                            for (var j = 0, k = part.length; j < k; j++) {
                                if (part.charCodeAt(j) > 127) {
                                    // we replace non-ASCII char with a temporary placeholder
                                    // we need this to make sure size of hostname is not
                                    // broken by replacing non-ASCII by nothing
                                    newpart += 'x';
                                } else {
                                    newpart += part[j];
                                }
                            }
                            // we test again with ASCII char only
                            if (!newpart.match(hostnamePartPattern)) {
                                var validParts = hostparts.slice(0, i);
                                var notHost = hostparts.slice(i + 1);
                                var bit = part.match(hostnamePartStart);
                                if (bit) {
                                    validParts.push(bit[1]);
                                    notHost.unshift(bit[2]);
                                }
                                if (notHost.length) {
                                    rest = '/' + notHost.join('.') + rest;
                                }
                                this.hostname = validParts.join('.');
                                break;
                            }
                        }
                    }
                }

                if (this.hostname.length > hostnameMaxLen) {
                    this.hostname = '';
                } else {
                    // hostnames are always lower case.
                    this.hostname = this.hostname.toLowerCase();
                }

                if (!ipv6Hostname) {
                    // IDNA Support: Returns a punycoded representation of "domain".
                    // It only converts parts of the domain name that
                    // have non-ASCII characters, i.e. it doesn't matter if
                    // you call it with a domain that already is ASCII-only.
                    this.hostname = punycode.toASCII(this.hostname);
                }

                var p = this.port ? ':' + this.port : '';
                var h = this.hostname || '';
                this.host = h + p;
                this.href += this.host;

                // strip [ and ] from the hostname
                // the host field still retains them, though
                if (ipv6Hostname) {
                    this.hostname = this.hostname.substr(1, this.hostname.length - 2);
                    if (rest[0] !== '/') {
                        rest = '/' + rest;
                    }
                }
            }

            // now rest is set to the post-host stuff.
            // chop off any delim chars.
            if (!unsafeProtocol[lowerProto]) {

                // First, make 100% sure that any "autoEscape" chars get
                // escaped, even if encodeURIComponent doesn't think they
                // need to be.
                for (var i = 0, l = autoEscape.length; i < l; i++) {
                    var ae = autoEscape[i];
                    if (rest.indexOf(ae) === -1)
                        continue;
                    var esc = encodeURIComponent(ae);
                    if (esc === ae) {
                        esc = escape(ae);
                    }
                    rest = rest.split(ae).join(esc);
                }
            }


            // chop off from the tail first.
            var hash = rest.indexOf('#');
            if (hash !== -1) {
                // got a fragment string.
                this.hash = rest.substr(hash);
                rest = rest.slice(0, hash);
            }
            var qm = rest.indexOf('?');
            if (qm !== -1) {
                this.search = rest.substr(qm);
                this.query = rest.substr(qm + 1);
                if (parseQueryString) {
                    this.query = querystring.parse(this.query);
                }
                rest = rest.slice(0, qm);
            } else if (parseQueryString) {
                // no query string, but parseQueryString still requested
                this.search = '';
                this.query = {};
            }
            if (rest) this.pathname = rest;
            if (slashedProtocol[lowerProto] &&
                this.hostname && !this.pathname) {
                this.pathname = '/';
            }

            //to support http.request
            if (this.pathname || this.search) {
                var p = this.pathname || '';
                var s = this.search || '';
                this.path = p + s;
            }

            // finally, reconstruct the href based on what has been validated.
            this.href = this.format();
            return this;
        };

// format a parsed object into a url string
        function urlFormat(obj) {
            // ensure it's an object, and not a string url.
            // If it's an obj, this is a no-op.
            // this way, you can call url_format() on strings
            // to clean up potentially wonky urls.
            if (util.isString(obj)) obj = urlParse(obj);
            if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
            return obj.format();
        }

        Url.prototype.format = function () {
            var auth = this.auth || '';
            if (auth) {
                auth = encodeURIComponent(auth);
                auth = auth.replace(/%3A/i, ':');
                auth += '@';
            }

            var protocol = this.protocol || '',
                pathname = this.pathname || '',
                hash = this.hash || '',
                host = false,
                query = '';

            if (this.host) {
                host = auth + this.host;
            } else if (this.hostname) {
                host = auth + (this.hostname.indexOf(':') === -1 ?
                    this.hostname :
                    '[' + this.hostname + ']');
                if (this.port) {
                    host += ':' + this.port;
                }
            }

            if (this.query &&
                util.isObject(this.query) &&
                Object.keys(this.query).length) {
                query = querystring.stringify(this.query);
            }

            var search = this.search || (query && ('?' + query)) || '';

            if (protocol && protocol.substr(-1) !== ':') protocol += ':';

            // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
            // unless they had them to begin with.
            if (this.slashes ||
                (!protocol || slashedProtocol[protocol]) && host !== false) {
                host = '//' + (host || '');
                if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
            } else if (!host) {
                host = '';
            }

            if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
            if (search && search.charAt(0) !== '?') search = '?' + search;

            pathname = pathname.replace(/[?#]/g, function (match) {
                return encodeURIComponent(match);
            });
            search = search.replace('#', '%23');

            return protocol + host + pathname + search + hash;
        };

        function urlResolve(source, relative) {
            return urlParse(source, false, true).resolve(relative);
        }

        Url.prototype.resolve = function (relative) {
            return this.resolveObject(urlParse(relative, false, true)).format();
        };

        function urlResolveObject(source, relative) {
            if (!source) return relative;
            return urlParse(source, false, true).resolveObject(relative);
        }

        Url.prototype.resolveObject = function (relative) {
            if (util.isString(relative)) {
                var rel = new Url();
                rel.parse(relative, false, true);
                relative = rel;
            }

            var result = new Url();
            var tkeys = Object.keys(this);
            for (var tk = 0; tk < tkeys.length; tk++) {
                var tkey = tkeys[tk];
                result[tkey] = this[tkey];
            }

            // hash is always overridden, no matter what.
            // even href="" will remove it.
            result.hash = relative.hash;

            // if the relative url is empty, then there's nothing left to do here.
            if (relative.href === '') {
                result.href = result.format();
                return result;
            }

            // hrefs like //foo/bar always cut to the protocol.
            if (relative.slashes && !relative.protocol) {
                // take everything except the protocol from relative
                var rkeys = Object.keys(relative);
                for (var rk = 0; rk < rkeys.length; rk++) {
                    var rkey = rkeys[rk];
                    if (rkey !== 'protocol')
                        result[rkey] = relative[rkey];
                }

                //urlParse appends trailing / to urls like http://www.example.com
                if (slashedProtocol[result.protocol] &&
                    result.hostname && !result.pathname) {
                    result.path = result.pathname = '/';
                }

                result.href = result.format();
                return result;
            }

            if (relative.protocol && relative.protocol !== result.protocol) {
                // if it's a known url protocol, then changing
                // the protocol does weird things
                // first, if it's not file:, then we MUST have a host,
                // and if there was a path
                // to begin with, then we MUST have a path.
                // if it is file:, then the host is dropped,
                // because that's known to be hostless.
                // anything else is assumed to be absolute.
                if (!slashedProtocol[relative.protocol]) {
                    var keys = Object.keys(relative);
                    for (var v = 0; v < keys.length; v++) {
                        var k = keys[v];
                        result[k] = relative[k];
                    }
                    result.href = result.format();
                    return result;
                }

                result.protocol = relative.protocol;
                if (!relative.host && !hostlessProtocol[relative.protocol]) {
                    var relPath = (relative.pathname || '').split('/');
                    while (relPath.length && !(relative.host = relPath.shift())) ;
                    if (!relative.host) relative.host = '';
                    if (!relative.hostname) relative.hostname = '';
                    if (relPath[0] !== '') relPath.unshift('');
                    if (relPath.length < 2) relPath.unshift('');
                    result.pathname = relPath.join('/');
                } else {
                    result.pathname = relative.pathname;
                }
                result.search = relative.search;
                result.query = relative.query;
                result.host = relative.host || '';
                result.auth = relative.auth;
                result.hostname = relative.hostname || relative.host;
                result.port = relative.port;
                // to support http.request
                if (result.pathname || result.search) {
                    var p = result.pathname || '';
                    var s = result.search || '';
                    result.path = p + s;
                }
                result.slashes = result.slashes || relative.slashes;
                result.href = result.format();
                return result;
            }

            var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
                isRelAbs = (
                    relative.host ||
                    relative.pathname && relative.pathname.charAt(0) === '/'
                ),
                mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
                removeAllDots = mustEndAbs,
                srcPath = result.pathname && result.pathname.split('/') || [],
                relPath = relative.pathname && relative.pathname.split('/') || [],
                psychotic = result.protocol && !slashedProtocol[result.protocol];

            // if the url is a non-slashed url, then relative
            // links like ../.. should be able
            // to crawl up to the hostname, as well.  This is strange.
            // result.protocol has already been set by now.
            // Later on, put the first path part into the host field.
            if (psychotic) {
                result.hostname = '';
                result.port = null;
                if (result.host) {
                    if (srcPath[0] === '') srcPath[0] = result.host;
                    else srcPath.unshift(result.host);
                }
                result.host = '';
                if (relative.protocol) {
                    relative.hostname = null;
                    relative.port = null;
                    if (relative.host) {
                        if (relPath[0] === '') relPath[0] = relative.host;
                        else relPath.unshift(relative.host);
                    }
                    relative.host = null;
                }
                mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
            }

            if (isRelAbs) {
                // it's absolute.
                result.host = (relative.host || relative.host === '') ?
                    relative.host : result.host;
                result.hostname = (relative.hostname || relative.hostname === '') ?
                    relative.hostname : result.hostname;
                result.search = relative.search;
                result.query = relative.query;
                srcPath = relPath;
                // fall through to the dot-handling below.
            } else if (relPath.length) {
                // it's relative
                // throw away the existing file, and take the new path instead.
                if (!srcPath) srcPath = [];
                srcPath.pop();
                srcPath = srcPath.concat(relPath);
                result.search = relative.search;
                result.query = relative.query;
            } else if (!util.isNullOrUndefined(relative.search)) {
                // just pull out the search.
                // like href='?foo'.
                // Put this after the other two cases because it simplifies the booleans
                if (psychotic) {
                    result.hostname = result.host = srcPath.shift();
                    //occationaly the auth can get stuck only in host
                    //this especially happens in cases like
                    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                        result.host.split('@') : false;
                    if (authInHost) {
                        result.auth = authInHost.shift();
                        result.host = result.hostname = authInHost.shift();
                    }
                }
                result.search = relative.search;
                result.query = relative.query;
                //to support http.request
                if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
                    result.path = (result.pathname ? result.pathname : '') +
                        (result.search ? result.search : '');
                }
                result.href = result.format();
                return result;
            }

            if (!srcPath.length) {
                // no path at all.  easy.
                // we've already handled the other stuff above.
                result.pathname = null;
                //to support http.request
                if (result.search) {
                    result.path = '/' + result.search;
                } else {
                    result.path = null;
                }
                result.href = result.format();
                return result;
            }

            // if a url ENDs in . or .., then it must get a trailing slash.
            // however, if it ends in anything else non-slashy,
            // then it must NOT get a trailing slash.
            var last = srcPath.slice(-1)[0];
            var hasTrailingSlash = (
                (result.host || relative.host || srcPath.length > 1) &&
                (last === '.' || last === '..') || last === '');

            // strip single dots, resolve double dots to parent dir
            // if the path tries to go above the root, `up` ends up > 0
            var up = 0;
            for (var i = srcPath.length; i >= 0; i--) {
                last = srcPath[i];
                if (last === '.') {
                    srcPath.splice(i, 1);
                } else if (last === '..') {
                    srcPath.splice(i, 1);
                    up++;
                } else if (up) {
                    srcPath.splice(i, 1);
                    up--;
                }
            }

            // if the path is allowed to go above the root, restore leading ..s
            if (!mustEndAbs && !removeAllDots) {
                for (; up--; up) {
                    srcPath.unshift('..');
                }
            }

            if (mustEndAbs && srcPath[0] !== '' &&
                (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
                srcPath.unshift('');
            }

            if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
                srcPath.push('');
            }

            var isAbsolute = srcPath[0] === '' ||
                (srcPath[0] && srcPath[0].charAt(0) === '/');

            // put the host back
            if (psychotic) {
                result.hostname = result.host = isAbsolute ? '' :
                    srcPath.length ? srcPath.shift() : '';
                //occationaly the auth can get stuck only in host
                //this especially happens in cases like
                //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                var authInHost = result.host && result.host.indexOf('@') > 0 ?
                    result.host.split('@') : false;
                if (authInHost) {
                    result.auth = authInHost.shift();
                    result.host = result.hostname = authInHost.shift();
                }
            }

            mustEndAbs = mustEndAbs || (result.host && srcPath.length);

            if (mustEndAbs && !isAbsolute) {
                srcPath.unshift('');
            }

            if (!srcPath.length) {
                result.pathname = null;
                result.path = null;
            } else {
                result.pathname = srcPath.join('/');
            }

            //to support request.http
            if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
                result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
            }
            result.auth = relative.auth || result.auth;
            result.slashes = result.slashes || relative.slashes;
            result.href = result.format();
            return result;
        };

        Url.prototype.parseHost = function () {
            var host = this.host;
            var port = portPattern.exec(host);
            if (port) {
                port = port[0];
                if (port !== ':') {
                    this.port = port.substr(1);
                }
                host = host.substr(0, host.length - port.length);
            }
            if (host) this.hostname = host;
        };

    }, {"./util": 6, "punycode": 1, "querystring": 4}],
    6: [function (require, module, exports) {
        'use strict';

        module.exports = {
            isString: function (arg) {
                return typeof (arg) === 'string';
            },
            isObject: function (arg) {
                return typeof (arg) === 'object' && arg !== null;
            },
            isNull: function (arg) {
                return arg === null;
            },
            isNullOrUndefined: function (arg) {
                return arg == null;
            }
        };

    }, {}],
    7: [function (require, module, exports) {
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
                // the event鈥檚 composed path. For shadow trees with `mode: 'closed'`, the initial event
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

    }, {}],
    8: [function (require, module, exports) {
        (function (global) {
            var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

            function toggleDropdown(e) {
                var $dropdown = $(e.currentTarget).parent().find('.dropdown-menu');

                $dropdown.toggleClass('open');
                e.stopPropagation();
                e.preventDefault();
            }

            function closeDropdown(e) {
                $('.dropdown-menu').removeClass('open');
            }

// Bind all dropdown
            function init() {
                $(document).on('click', '.toggle-dropdown', toggleDropdown);
                $(document).on('click', '.dropdown-menu', function (e) {
                    e.stopPropagation();
                });
                $(document).on('click', closeDropdown);
            }

            module.exports = {
                init: init
            };


        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}],
    9: [function (require, module, exports) {
        var dropdown = require('./dropdown');
        var keyboard = require('./keyboard');
        var navigation = require('./navigation');
        var sidebar = require('./sidebar');
        var toolbar = require('./toolbar');

        var gitbook = window.gitbook;

        function init() {
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
        }

        gitbook.events.on('start', init);

        gitbook.keyboard = keyboard;
        gitbook.navigation = navigation;
        gitbook.sidebar = sidebar;
        gitbook.toolbar = toolbar;

    }, {"./dropdown": 8, "./keyboard": 10, "./navigation": 12, "./sidebar": 14, "./toolbar": 15}],
    10: [function (require, module, exports) {
        var Mousetrap = require('mousetrap');

        var navigation = require('./navigation');
        var sidebar = require('./sidebar');

// Bind a keyboard shortcuts
        function bindShortcut(keys, fn) {
            Mousetrap.bind(keys, function (e) {
                fn();
                return false;
            });
        }


// Bind keyboard shortcuts
        function init() {
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

        module.exports = {
            init: init,
            bind: bindShortcut
        };

    }, {"./navigation": 12, "./sidebar": 14, "mousetrap": 7}],
    11: [function (require, module, exports) {
        var gitbook = window.gitbook;

        function showLoading(p) {
            gitbook.state.$book.addClass('is-loading');
            p.always(function () {
                gitbook.state.$book.removeClass('is-loading');
            });

            return p;
        }

        module.exports = {
            show: showLoading
        };

    }, {}],
    12: [function (require, module, exports) {
        (function (global) {
            var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);
            var url = require('url');

            var loading = require('./loading');
            var platform = require('./platform');

            var gitbook = window.gitbook;

            var usePushState = (typeof history.pushState !== 'undefined');

            /*
    Get current scroller element
*/
            function getScroller() {
                if (platform.isSmallScreen()) {
                    return $('.book-body');
                } else {
                    return $('.body-inner');
                }
            }

            /*
    Scroll to a specific hash tag in the content
*/
            function scrollToHash(hash) {
                var $scroller = getScroller(),
                    dest = 0;

                // Don't try to scroll if element doesn't exist
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
    Return wether the element exists on the page
 */
            function pageHasElement(id) {
                var $scroller = getScroller(),
                    $el = $scroller.find(id);

                return !!$el.length;
            }

            /*
    Utility functions
*/

// Checks if a jQuery element is empty
            function isEmpty(element) {
                return element.length === 0;
            }

// Any returns true if the predicate is true on any of the elements in the list
            function any(arr, predicate) {
                return arr.length > 0 && arr.filter(predicate).length > 0;

            }

            /*
    Return the top position of an element
 */
            function getElementTopPosition(id) {
                // Get actual position of element if nested
                var $scroller = getScroller(),
                    $container = $scroller.find('.page-inner'),
                    $el = $scroller.find(id),
                    $parent = $el.offsetParent(),
                    dest = 0;

                // Exit early if we can't find any of those elements
                if (any([$scroller, $container, $el, $parent], isEmpty)) {
                    return 0;
                }

                dest = $el.position().top;

                // Note: this could be a while loop, but to avoid any chances of infinite loops
                // we'll limit the max iterations to 10
                var MAX_ITERATIONS = 10;
                for (var i = 0; i < MAX_ITERATIONS; i++) {
                    // Stop when we find the element's ancestor just below $container
                    // or if we hit the top of the dom (parent's parent is itself)
                    if ($parent.is($container) || $parent.is($parent.offsetParent())) {
                        break;
                    }

                    // Go up the DOM tree, to the next parent
                    $el = $parent;
                    dest += $el.position().top;
                    $parent = $el.offsetParent();
                }

                // Return rounded value since
                // jQuery scrollTop() returns an integer
                return Math.floor(dest);
            }


            /*
    Handle updating summary at scrolling
*/
            var $chapters,
                $activeChapter;

// Set a chapter as active in summary and update state
            function setChapterActive($chapter, hash) {
                // No chapter and no hash means first chapter
                if (!$chapter && !hash) {
                    $chapter = $chapters.first();
                }

                // If hash is provided, set as active chapter
                if (!!hash) {
                    // Multiple chapters for this file
                    if ($chapters.length > 1) {
                        $chapter = $chapters.filter(function () {
                            var titleId = getChapterHash($(this));
                            return titleId == hash;
                        }).first();
                    }
                    // Only one chapter, no need to search
                    else {
                        $chapter = $chapters.first();
                    }
                }

                // Don't update current chapter
                if ($chapter.is($activeChapter)) {
                    return;
                }

                // Update current active chapter
                $activeChapter = $chapter;

                // Add class to selected chapter
                $chapters.removeClass('active');
                $chapter.addClass('active');

                // Update history state if needed
                hash = getChapterHash($chapter);

                var oldUri = window.location.pathname + window.location.hash,
                    uri = window.location.pathname + hash;

                if (uri != oldUri) {
                    history.replaceState({path: uri}, null, uri);
                }
            }

// Return the hash of link for a chapter
            function getChapterHash($chapter) {
                var $link = $chapter.children('a'),
                    hash = $link.attr('href').split('#')[1];

                if (hash) hash = '#' + hash;
                return (!!hash) ? hash : '';
            }

// Handle user scrolling
            function handleScrolling() {
                // Get current page scroll
                var $scroller = getScroller(),
                    scrollTop = $scroller.scrollTop(),
                    scrollHeight = $scroller.prop('scrollHeight'),
                    clientHeight = $scroller.prop('clientHeight'),
                    nbChapters = $chapters.length,
                    $chapter = null;

                // Find each title position in reverse order
                $($chapters.get().reverse()).each(function (index) {
                    var titleId = getChapterHash($(this)),
                        titleTop;

                    if (!!titleId && !$chapter) {
                        titleTop = getElementTopPosition(titleId);

                        // Set current chapter as active if scroller passed it
                        if (scrollTop >= titleTop) {
                            $chapter = $(this);
                        }
                    }
                    // If no active chapter when reaching first chapter, set it as active
                    if (index == (nbChapters - 1) && !$chapter) {
                        $chapter = $(this);
                    }
                });

                // ScrollTop is at 0, set first chapter anyway
                if (!$chapter && !scrollTop) {
                    $chapter = $chapters.first();
                }

                // Set last chapter as active if scrolled to bottom of page
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
                var prevUriParsed = url.parse(prevUri);

                var uri = url.resolve(window.location.pathname, relativeUrl);
                var uriParsed = url.parse(uri);
                var hash = uriParsed.hash;

                // Is it the same url (just hash changed?)
                var pathHasChanged = (uriParsed.pathname !== prevUriParsed.pathname);

                // Is it an absolute url
                var isAbsolute = Boolean(uriParsed.hostname);

                if (!usePushState || isAbsolute) {
                    // Refresh the page to the new URL if pushState not supported
                    location.href = relativeUrl;
                    return;
                }

                // Don't fetch same page
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
                            // For GitBook.com, we handle redirection signaled by the server
                            var responseURL = xhr.getResponseHeader('X-Current-Location') || uri;

                            // Replace html content
                            html = html.replace(/<(\/?)(html|head|body)([^>]*)>/ig, function (a, b, c, d) {
                                return '<' + b + 'div' + (b ? '' : ' data-element="' + c + '"') + d + '>';
                            });

                            var $page = $(html),
                                $pageBody = $page.find('.book'),
                                $pageHead;

                            // We only use history.pushState for pages generated with GitBook
                            if ($pageBody.length === 0) {
                                var err = new Error('Invalid gitbook page, redirecting...');
                                return deferred.reject(err);
                            }

                            // Push url to history
                            if (push) {
                                history.pushState({
                                    path: responseURL
                                }, null, responseURL);
                            }

                            // Force reparsing HTML to prevent wrong URLs in Safari
                            $page = $(html);
                            $pageHead = $page.find('[data-element=head]');
                            $pageBody = $page.find('.book');

                            // Merge heads
                            // !! Warning !!: we only update necessary portions to avoid strange behavior (page flickering etc ...)

                            // Update title
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
                            gitbook.state.$book = $('.book');
                            preparePage(!hash);

                            // Scroll to hashtag position
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

                // Reset scroll to get current scroller
                var $scroller = getScroller();
                // Unbind existing scroll event
                $scroller.unbind('scroll');
                $scroller.scroll(handleScrolling);
            }

            function preparePage(resetScroll) {
                var $bookBody = $('.book-body');
                var $bookInner = $bookBody.find('.body-inner');
                var $pageWrapper = $bookInner.find('.page-wrapper');

                // Update navigation position
                updateNavigationPosition();

                // Focus on content
                $pageWrapper.focus();

                // Get scroller
                var $scroller = getScroller();

                // Reset scroll
                if (resetScroll !== false) {
                    $scroller.scrollTop(0);
                }

                // Get current page summary chapters
                $chapters = $('.book-summary .summary .chapter')
                    .filter(function () {
                        var $link = $(this).children('a'),
                            href = null;

                        // Chapter doesn't have a link
                        if (!$link.length) {
                            return false;
                        } else {
                            href = $link.attr('href').split('#')[0];
                        }

                        var resolvedRef = url.resolve(window.location.pathname, href);
                        return window.location.pathname == resolvedRef;
                    });

                // Bind scrolling if summary contains more than one link to this page
                if ($chapters.length > 1) {
                    $scroller.scroll(handleScrolling);
                }
                // Else, set only chapter in summary as active
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
    Handle click on a link
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

            function goNext() {
                var url = $('.navigation-next').attr('href');
                if (url) handleNavigation(url, true);
            }

            function goPrev() {
                var url = $('.navigation-prev').attr('href');
                if (url) handleNavigation(url, true);
            }


            function init() {
                // Prevent cache so that using the back button works
                // See: http://stackoverflow.com/a/15805399/983070
                $.ajaxSetup({
                    cache: false
                });

                // Recreate first page when the page loads.
                history.replaceState({path: window.location.href}, '');

                // Back Button Hijacking :(
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

                // Prepare current page
                preparePage(false);
            }

            module.exports = {
                init: init,
                goNext: goNext,
                goPrev: goPrev
            };

        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {"./loading": 11, "./platform": 13, "url": 5}],
    13: [function (require, module, exports) {
        (function (global) {
            var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

            module.exports = {
                isMobile: function () {
                    return ($(document).width() <= 600);
                },
                // Breakpoint for navigation links position
                isSmallScreen: function () {
                    return ($(document).width() <= 1240);
                }
            };

        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}],
    14: [function (require, module, exports) {
        (function (global) {
            var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

            var platform = require('./platform');

            var gitbook = window.gitbook;

// Toggle sidebar with or withour animation
            function toggleSidebar(_state, animation) {
                if (gitbook.state != null && isOpen() == _state) return;
                if (animation == null) animation = true;

                gitbook.state.$book.toggleClass('without-animation', !animation);
                gitbook.state.$book.toggleClass('with-summary', _state);

                gitbook.storage.set('sidebar', isOpen());
            }

// Return true if sidebar is open
            function isOpen() {
                return gitbook.state.$book.hasClass('with-summary');
            }

// Prepare sidebar: state and toggle button
            function init() {
                // Init last state if not mobile
                if (!platform.isMobile()) {
                    toggleSidebar(gitbook.storage.get('sidebar', true), false);
                }

                // Close sidebar after clicking a link on mobile
                $(document).on('click', '.book-summary li.chapter a', function (e) {
                    if (platform.isMobile()) toggleSidebar(false, false);
                });
            }

// Filter summary with a list of path
            function filterSummary(paths) {
                var $summary = $('.book-summary');

                $summary.find('li').each(function () {
                    var path = $(this).data('path');
                    var st = paths == null || paths.indexOf(path) !== -1;

                    $(this).toggle(st);
                    if (st) $(this).parents('li').show();
                });
            }

            module.exports = {
                init: init,
                isOpen: isOpen,
                toggle: toggleSidebar,
                filter: filterSummary
            };

        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {"./platform": 13}],
    15: [function (require, module, exports) {
        (function (global) {
            var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

            var gitbook = window.gitbook;

// List of created buttons
            var buttons = [],
// Generated Id for buttons
                BTN_ID = 0;

            function generateId() {
                return 'btn-' + (BTN_ID++);
            }

// Insert a jquery element at a specific position
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

// Default click handler
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

// Create a new button in the toolbar
            function createButton(opts) {
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

// Remove a button provided its id
            function removeButton(id) {
                buttons = $.grep(buttons, function (button) {
                    return button.id != id;
                });

                updateAllButtons();
            }

// Remove multiple buttons from an array of ids
            function removeButtons(ids) {
                buttons = $.grep(buttons, function (button) {
                    return ids.indexOf(button.id) == -1;
                });

                updateAllButtons();
            }

// When page changed, reset buttons
            gitbook.events.on('page.change', function () {
                updateAllButtons();
            });

            module.exports = {
                createButton: createButton,
                removeButton: removeButton,
                removeButtons: removeButtons
            };

        }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    }, {}]
}, {}, [9]);