(function () {
    'use strict';

    var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

    function searchYouTube(query, callback) {
        var url = 'https://inv.nadeko.net/api/v1/search?q=' + encodeURIComponent(query) + '&type=video&page=1';
        Lampa.Network.silent(url, function (json) {
            if (json && json.length) callback(null, json[0]);
            else callback('not_found');
        }, function () { callback('error'); });
    }

    function getTMDBTrailer(card, callback) {
        var id = card.id;
        var type = card.number_of_seasons ? 'tv' : 'movie';
        var url = 'https://api.themoviedb.org/3/' + type + '/' + id + '/videos?api_key=' + TMDB_KEY + '&language=en-US';
        Lampa.Network.silent(url, function (json) {
            if (json && json.results && json.results.length) {
                var t = json.results.find(function(v){ return v.type==='Trailer' && v.site==='YouTube' && v.official; })
                     || json.results.find(function(v){ return v.type==='Trailer' && v.site==='YouTube'; })
                     || json.results[0];
                callback(null, t);
            } else callback('not_found');
        }, function () { callback('error'); });
    }

    function playYoutube(videoId, title) {
        Lampa.Player.play({ title: title, url: 'https://www.youtube.com/watch?v=' + videoId, youtube: true });
        Lampa.Player.playlist([{ title: title, url: 'https://www.youtube.com/watch?v=' + videoId, youtube: true }]);
    }

    function showTrailers(object) {
        var card = object.card;
        var title = (card.title || card.name || card.original_title || card.original_name || '').trim();
        var year = (card.year || card.first_air_date || card.release_date || '').toString().slice(0, 4);
        if (!title) { Lampa.Noty.show('Название не определено'); return; }

        var loader = Lampa.Loading.start();
        var results = { original: null, russian: null };
        var count = 0;

        function done() {
            count++;
            if (count < 2) return;
            Lampa.Loading.stop(loader);
            if (!results.original && !results.russian) { Lampa.Noty.show('Трейлеры не найдены'); return; }

            var items = [];
            if (results.original) items.push({ title: '▶  Оригинальный трейлер', subtitle: results.original.name || '', vid: results.original.key, label: 'Оригинал — ' + title });
            if (results.russian)  items.push({ title: '▶  Трейлер на русском',   subtitle: results.russian.title  || '', vid: results.russian.videoId || results.russian.id, label: 'Русский — ' + title });

            Lampa.Select.show({
                title: 'Трейлеры: ' + title,
                items: items,
                onSelect: function (item) {
                    if (!item.vid) { Lampa.Noty.show('Видео не найдено'); return; }
                    playYoutube(item.vid, item.label);
                },
                onBack: function () { Lampa.Controller.toggle('content'); }
            });
        }

        getTMDBTrailer(card, function (err, video) { if (!err && video) results.original = video; done(); });
        searchYouTube(title + (year ? ' ' + year : '') + ' трейлер на русском', function (err, video) { if (!err && video) results.russian = video; done(); });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;
            var object = e.object;
            var render = object.activity.render();
            render.find('.my-trailer-btn').remove();

            var btn = $('<div class="view--trailer selector my-trailer-btn"></div>').text('Трейлеры');
            btn.on('hover:enter', function () { showTrailers(object); });

            var first = render.find('.view--button').first();
            if (first.length) first.after(btn);
            else render.find('.full-start__buttons').prepend(btn);
        });
        console.log('[Trailers RU+EN] v2 loaded');
    }

    if (window.appready) init();
    else document.addEventListener('appready', init);

})();
