/**
 * Prism渲染
 */
function Prism_init() {
    require(['lsbook'], function (lsbook) {
        lsbook.events.bind('page.change', function () {
            if (typeof Prism != "undefined") {
                Prism.highlightAll();
            }
        });
    });
}

/**
 * mermaid 流程图渲染
 */
function mermaid_init() {
    require(['lsbook'], function (lsbook) {
        lsbook.events.bind('page.change', function () {
            if (typeof mermaid != "undefined") {
                var config = {
                    startOnLoad: true,
                    flowchart: {
                        useMaxWidth: false,
                        htmlLabels: true
                    },
                    theme: 'forest'
                };
                mermaid.initialize(config);
                mermaid.init();
            }
        });
    });
}

/**
 * 数学公式刷新
 */
function Math_up() {
    require(['lsbook', 'jQuery'], function (lsbook) {
        lsbook.events.bind('page.change', function () {
            if (typeof renderMathInElement != "undefined") {
                renderMathInElement(document.body, {
                    displayMode: false
                });
            }
        });
    });
}

/**
 * 章节扩展
 */
function ExpandableChapters() {
    require(['lsbook', 'jQuery'], function (lsbook, $) {
        var TOGGLE_CLASSNAME = 'expanded',
            CHAPTER = '.chapter',
            ARTICLES = '.articles',
            TRIGGER_TEMPLATE = '<i class="exc-trigger fa"></i>',
            LS_NAMESPACE = 'expChapters';
        var init = function () {
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
        };
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
            init();
        });
    });
}

/**
 * Github 按钮
 */
function GitHubButtons() {
    require(['lsbook'], function (lsbook) {
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
    });
}

/**
 * 隐藏答案分块
 */
function sectionx() {
    require(["lsbook", "jquery"], function (lsbook, $) {
        lsbook.events.bind("page.change", function () {
            $('.section').each(function () {
                $(this).click(function () {
                    const target = $(this).attr('target');
                    const show = $(this).hasClass("sec-show");
                    $(this).toggleClass("sec-show", !show);
                    $(this).children().toggleClass("fa-angle-up", !show).toggleClass("fa-angle-down", show);
                    $('#' + target).toggleClass("in", !show).toggleClass("collapse", show);
                });
            });
        });
    });
}

/**
 * 左侧分离
 */
function splitter() {
    require(['lsbook', 'jQuery'], function (lsbook, $) {
        if ($(window).width() <= 600) {
            return;
        }

        lsbook.events.bind('start', function () {
        });

        lsbook.events.bind('page.change', function () {
            var KEY_SPLIT_STATE = 'lsbook_split';

            var isDraggable = false;
            var splitState;
            var grabPointWidth = null;

            var $body = $('body');
            var $summary = $('.book-summary');
            var $bookBody = $('.book-body');
            var $divider = $('<div class="divider-content-summary">' +
                '<div class="divider-content-summary__icon">' +
                '<i class="fa fa-ellipsis-v"></i>' +
                '</div>' +
                '</div>');

            $summary.append($divider);

            // restore split state from sessionStorage
            splitState = getSplitState();
            setSplitState(
                splitState.summaryWidth,
                splitState.summaryOffset,
                splitState.bookBodyOffset
            );

            setTimeout(function () {
                var $toggleSummary = $('.fa.fa-align-justify').parent();

                $toggleSummary.on('click', function () {

                    var summaryOffset = null;
                    var bookBodyOffset = null;

                    var isOpen = !lsbook.sidebar.isOpen();

                    if (isOpen) {
                        summaryOffset = -($summary.outerWidth());
                        bookBodyOffset = 0;
                    } else {
                        summaryOffset = 0;
                        bookBodyOffset = $summary.outerWidth();
                    }

                    setSplitState($summary.outerWidth(), summaryOffset, bookBodyOffset);
                    saveSplitState($summary.outerWidth(), summaryOffset, bookBodyOffset);
                });

                $('.on-toolbar-action').on('click', function () {
                    $('.fa.fa-align-justify').parent()[0].click();
                });

                function fixationTopHight() {
                    var h = window.innerHeight || document.body.clientHeight || document.documentElement.clientHeight;
                    $(".divider-content-summary").css({
                        top: ($summary.scrollTop()),
                        hight: h
                    });
                }

                $summary.scroll(
                    function () {
                        fixationTopHight();
                    }
                );
                window.onscroll = fixationTopHight;
                window.onresize = fixationTopHight;

            }, 1);

            $divider.on('mousedown', function (event) {
                event.stopPropagation();
                isDraggable = true;
                grabPointWidth = $summary.outerWidth() - event.pageX;
            });

            $body.on('mouseup', function (event) {
                event.stopPropagation();
                isDraggable = false;
                saveSplitState(
                    $summary.outerWidth(),
                    $summary.position().left,
                    $bookBody.position().left
                );
            });

            $body.on('mousemove', function (event) {
                if (!isDraggable) {
                    return;
                }
                event.stopPropagation();
                event.preventDefault();
                $summary.outerWidth(event.pageX + grabPointWidth);
                $bookBody.offset({
                    left: event.pageX + grabPointWidth
                });
            });

            function getSplitState() {
                var splitState = JSON.parse(sessionStorage.getItem(KEY_SPLIT_STATE));
                splitState = splitState || {};
                splitState.summaryWidth = splitState.summaryWidth || $summary.outerWidth();
                splitState.summaryOffset = splitState.summaryOffset || $summary.position().left;
                splitState.bookBodyOffset = splitState.bookBodyOffset || $bookBody.position().left;
                return splitState;
            }

            function saveSplitState(summaryWidth, summaryWidthOffset, bookBodyOffset) {
                sessionStorage.setItem(KEY_SPLIT_STATE, JSON.stringify({
                    summaryWidth: summaryWidth,
                    summaryOffset: summaryWidthOffset,
                    bookBodyOffset: bookBodyOffset,
                }));
            }

            function setSplitState(summaryWidth, summaryOffset, bookBodyOffset) {
                $summary.outerWidth(summaryWidth);
                $summary.offset({
                    left: summaryOffset
                });
                $bookBody.offset({
                    left: bookBodyOffset
                });
                $summary.css({
                    position: 'absolute'
                });
                $bookBody.css({
                    position: 'absolute'
                });
            }
        });
    });
}

/**
 * 划过显示
 */
function spoiler() {
    require(["lsbook", "jquery"], function (lsbook, $) {
        lsbook.events.bind("page.change", function () {
            $('.spoiler').hover(function () {
                $(this).addClass('hover');
            }, function () {
                $(this).removeClass('hover');
            });

        });
    });
}

/**
 * 搜索
 */
function search() {
    require([
        'lsbook',
        'jquery'
    ], function (lsbook, $) {
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
    });
}

mermaid_init();
sectionx();
spoiler();
ExpandableChapters();
GitHubButtons();
splitter();
Math_up();
Prism_init();
search();