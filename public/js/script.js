$(document).ready(function() {
    const view = _view()
    view.init()
});

function _view() {
    const playlistName = $('#new-playlist-name')
    const playlistDescription = $('#new-playlist-description')
    const playlists = $('#playlists')
    const playlistForm = $('#playlist-form')
    const optionTemplate = Handlebars.compile('<option value={{uri}} selected="selected">{{name}}</option>')
    const playlistWidgetTemplate = Handlebars.compile('<iframe src="https://open.spotify.com/embed?theme=white&uri={{uri}}" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>')
    const albumTitleTemplate = Handlebars.compile('<li class="collection-header">{{name}}</li>{{#each tracks}}<li class="collection-item"><span>{{track_number}} - {{name}}</span></li>{{/each}}')
    const playlistModal = $('#playlist-modal')
    const widget = $('#widget')
    const albumWidget = $('#album')

    function soundtrackify(title) {
        return title.length < 7 && title.search(/(original score)|(original motion picture soundtrack)/gi) === -1 ? encodeURIComponent(`${title} soundtrack`) : encodeURIComponent(title)
    }

    function populateTracks(currentMovie) {
        let title = soundtrackify(currentMovie.data('title'))
        fetch(`/tracks/${title}`, { credentials: 'same-origin' })
            .then(response => {
                if (response.ok) return response.json()
                Promise.reject(response)
            })
            .then(albums => {
                const trackList = albumTitleTemplate(albums[0])
                albumWidget.html(trackList)
            })
            .catch(error => {

            })
    }

    function init() {
        //stuff for slick
        $('.coverflow').on('init', (event, slick) => {
            let currentMovie = $(`#movie-${slick.currentSlide}`)
            populateTracks(currentMovie)
        })

        $('.coverflow').on('afterChange', (event, slick, slide) => {
            let currentMovie = $(`#movie-${slide}`)
            populateTracks(currentMovie)
        })

        $('.coverflow').slick({
            slidesToShow: 1,
            dots: true,
            prevArrow: '<button type="button" class="btn btn-large next"><i class="material-icons">skip_previous</i></button>',
            nextArrow: '<button type="button" class="btn btn-large previous"><i class="material-icons">skip_next</i></button>',
            responsive: [{
                    breakpoint: 768,
                    settings: {
                        dots: false
                    }
                },
                {
                    breakpoint: 540,
                    settings: {
                        arrows: false,
                        dots: false
                    }
                }
            ]
        })

        playlistForm.submit(function(event) {
            event.preventDefault()
            const formData = $(this).serializeArray().reduce((prev, curr) => {
                if (curr.value === "") return prev
                prev[curr.name] = curr.value
                return prev
            }, {})
            fetch('/playlist', { method: 'POST', body: JSON.stringify(formData), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' })
                .then(response => {
                    if (response.ok) {
                        return response.json()
                    }
                    return Promise.reject(error)
                })
                .then(data => {
                    playlists.prepend(optionTemplate(data))
                    playlists.material_select()
                    playlistModal.modal('close')
                })
                .catch(error => {
                    // TODO:
                    // - handle errors
                })
        })

        playlists.change(function(event) {
            const newPlaylist = playlistWidgetTemplate({ uri: event.target.selectedOptions[0].value })
            widget.html(newPlaylist)
        })

        //stuff for materialize
        $('.dropdown-button').dropdown()
        $('.button-collapse').sideNav()
        $('select').material_select()
        $('#new-playlist-description').trigger('autoresize')
        playlistModal.modal()
    }
    return { init }
}