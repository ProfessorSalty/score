'use strict'
$(document).ready(function() {
    const model = _model()
    const controller = _controller(model)
    const view = _view(controller)
    view.init()
});

function _view(_c) {
    // any title shorter than this are difficult to get good results for
    const SHORTTITLE = 7
    const controller = _c
    const playlistName = $('#new-playlist-name')
    const playlistDescription = $('#new-playlist-description')
    const playlists = $('#playlists')
    const playlistForm = $('#playlist-form')
    const optionTemplate = Handlebars.compile('<option value={{uri}} selected="selected">{{name}}</option>')
    const playlistWidgetTemplate = Handlebars.compile('<iframe src="https://open.spotify.com/embed?theme=white&uri={{uri}}" width="300" height="380" frameborder="0" allowtransparency="true"></iframe>')
    const albumTitleTemplate = Handlebars.compile('{{#each albums}}<li class="collection-header">{{name}}</li>{{#each tracks}}<li class="collection-item row" data-id={{id}}><span class="col s10">{{track_number}} - {{name}}</span><button type="button" class="tooltipped waves-effect waves-teal btn-flat secondary-content col s2 add-to-list" data-uri="{{uri}}">+</button></li>{{/each}}{{/each}}')
    const playlistModal = $('#playlist-modal')
    const widget = $('#widget')
    const trackAndAlbumList = $('#album')

    function updatePlaylistWidget() {
        const newPlaylist = playlistWidgetTemplate({ uri: controller.currentPlaylist() })
        widget.html(newPlaylist)
    }

    function setCurrentPlaylist(uri) {
        controller.currentPlaylist(uri)
        updatePlaylistWidget()
    }

    function soundtrackify(title) {
        return title.length < SHORTTITLE ? encodeURIComponent(`${title} soundtrack`) : encodeURIComponent(title)
    }

    function populateTracks(currentMovie) {
        const title = soundtrackify(currentMovie.data('title'))
        const year = currentMovie.data('release-date').slice(0, 4)
        controller.getTracks(title, year)
            .then(albums => {
                if (albums.length) {
                    const trackList = albumTitleTemplate({ albums })
                    trackAndAlbumList.html(trackList)
                    $('.tooltipped').tooltip({ delay: 1000, tooltip: "Add to playlist", position: "right" })
                } else {
                    trackAndAlbumList.html('<li class="collection-header">There doesn\'t seem to be any albums for this movie</li>')
                }

            })
            .catch(error => {
                console.error(error)
            })
    }

    function init() {
        //stuff for slick
        $('.coverflow').on('init', (event, slick) => {
            const currentMovie = $(`#movie-${slick.currentSlide}`)
            populateTracks(currentMovie)
            $('.display').removeClass('hidden')
        })

        $('.coverflow').on('beforeChange', () => trackAndAlbumList.html('<li class="collection-item"><div class="progress"><div class="indeterminate"></div></div></li>'))

        $('.coverflow').on('afterChange', (event, slick, slide) => {
            const currentMovie = $(`#movie-${slide}`)
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

        trackAndAlbumList.on('click', '.add-to-list', event => {
            controller.addTrackToPlaylist($(event.target).data('uri'))
                .then(data => {
                    updatePlaylistWidget()
                    Materialize.toast('<div class="success">Added to playlist</div>', 6000)
                })
                .catch(error => {
                    console.error(error)
                    Materialize.toast('<div class="problem">There was a problem adding that track</div>', 6000)
                })
        })

        playlistForm.submit(function(event) {
            event.preventDefault()
            const formData = $(this).serializeArray().reduce((prev, curr) => {
                if (curr.value === "") return prev
                prev[curr.name] = curr.value
                return prev
            }, {})
            controller.getPlaylists(formData)
                .then(data => {
                    playlists.prepend(optionTemplate(data))
                    playlists.material_select()
                    playlistModal.modal('close')
                })
                .catch(error => {
                    console.error(error)
                    playlists.prepend('<option value="" disabled>There was a problem</option>')
                })
        })

        playlists.change(function(event) {
            setCurrentPlaylist(event.target.selectedOptions[0].value)
        })

        //stuff for materialize
        $('.dropdown-button').dropdown()
        $('.button-collapse').sideNav()

        $('select').material_select()
        $('#new-playlist-description').trigger('autoresize')
        playlistModal.modal()

        setCurrentPlaylist(playlists[0].selectedOptions[0].value)
    }
    return { init }
}

function _controller(_m) {
    const model = _m
    const state = {
        currentPlaylist: undefined
    }

    function getPlaylistId(uri) {
        const items = uri.split(':')
        const lastItem = items.length - 1
        return items[lastItem]
    }

    function getIdFromUri() {
        return getPlaylistId(state.currentPlaylist)
    }

    return {
        currentPlaylist: _ => {
            if (!_) return state.currentPlaylist
            state.currentPlaylist = _
            return state.currentPlaylist
        },
        getPlaylists: data => model.postJSON('/playlists', data),
        getTracks: (title, year) => model.getJSON(`/tracks/${title}?year=${year}`),
        addTrackToPlaylist: track => model.putJSON(`/playlists/${getIdFromUri()}/tracks/${encodeURIComponent(track)}`)
    }
}

function _model(_c) {
    const controller = _c

    function handleResponse(response) {
        if (response.ok) return response.json()
        return Promise.reject(response)
    }

    function postJSON(url, body) {
        return fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' }, credentials: 'same-origin' })
            .then(handleResponse)
    }

    function getJSON(url) {
        return fetch(url, { credentials: 'same-origin' })
            .then(handleResponse)
    }

    function putJSON(url) {
        return fetch(url, { method: 'PUT', credentials: 'same-origin' })
    }

    return { postJSON, getJSON, putJSON }
}