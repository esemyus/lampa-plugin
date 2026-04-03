(function () {
    'use strict';

    var PLUGIN = {
        name:    'Trailers RU+EN',
        version: '1.0.0'
    };

    function ytSearch(query, callback) {
        Lampa.Network.silent(
            'https://inv.nadeko.net/api/v1/search?q=' + encodeURIComponent(query) + '&type=video&page=1',
            function (json) {
                if (json && json.length) {
                    callback(null, json[0]);
                } else {
                    callback('not_found');
                }
            },
            function (err) {
                callback(err || 'error');
            }
        );
    }

    function buildYtUrl(videoId) {
        return 'https://www.youtube.com/watch?v=' + videoId;
    }

    function TrailersPlugin(object) {
        var card  = object.card;
        var title = (card.title || card.name || '').trim();
        var year  = (card.year || '');

        if (!title) {
            Lampa.Noty.show('Название фильма не определено');
            return;
        }

        var queryOriginal = title + (year ? ' ' + year : '') + ' official trailer';
        var queryRussian  = title + (year ? ' ' + year : '') + ' трейлер на русском официальный';

        var loader = Lampa.Loading.start();
        var results = { original: null, russian: null };
        var done = 0;

        function finish() {
            done++;
            if (done < 2) return;
            Lampa.Loading.stop(loader);

            if (!results.original && !results.russian) {
                Lampa.Noty.show('Трейлеры не найдены');
                return;
            }

            var items = [];

            if (results.original) {
                items.push({
                    title: '▶  Оригинальный трейлер',
                    subtitle: results.original.title || '',
                    trailer: results.original
                });
            }

            if (results.russian) {
                items.push({
                    title: '▶  Трейлер на русском',
                    subtitle: results.russian.title || '',
                    trailer: results.russian
                });
            }

            Lampa.Select.show({
                title: 'Трейлеры: ' + title,
                items: items,
                onSelect: function (item) {
                    var vid = item.trailer.videoId || item.trailer.id || '';
                    if (!vid) {
                        Lampa.Noty.show('Не удалось получить ID видео');
                        return;
                    }
                    Lampa.Player.play({
                        title:   item.title + ' — ' + title,
                        url:     buildYtUrl(vid),
                        youtube: true
                    });
                    Lampa.Player.playlist([{
                        title:   item.title + ' — ' + title,
                        url:     buildYtUrl(vid),
                        youtube: true
                    }]);
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        ytSearch(queryOriginal, function (err, video) {
            if (!err) results.original = video;
            finish();
        });

        ytSearch(queryRussian, function (err, video) {
            if (!err) results.russian = video;
            finish();
        });
    }

    function init() {
        if (window.Lampa === undefined) {
            document.addEventListener('lampa:ready', init);
            return;
        }

        Lampa.ContextMenu.add({
            name: PLUGIN.name,
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
            filter: function (object) {
                return !!(object && object.card && (object.card.title || object.card.name));
            },
            action: function (object) {
                TrailersPlugin(object);
            }
        });

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complect') return;
            e.object.activity.render().find('.view--button').prepend(
                $('<div class="button selector"></div>')
                    .text('Трейлеры')
                    .on('hover:enter', function () {
                        TrailersPlugin(e.object);
                    })
            );
        });

        console.log('[Trailers RU+EN] loaded');
    }

    if (window.appready) {
        init();
    } else {
        document.addEventListener('appready', init);
    }

})();
