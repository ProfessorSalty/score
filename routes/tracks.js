const express = require('express')
const router = express.Router()
const { getAlbums, getTracks } = require('../utils/spotify')

router.get('/:title', (request, response) => {
    const albumId = request.params.title
    const token = request.session.grant.response.access_token
    getAlbums(token, albumId)
        .then(data => {
            const items = data.albums.items
            const albums = items.filter(album => album.album_type === 'album')
            const ost = albums.filter(album => album.name.search(/(original score)|(original motion picture soundtrack)/gi) !== -1)
            const final = ost.length > 0 ? ost : albums.slice(0, 1)
            getTracks(token, final)
                .then(data => {
                    for (let i = 0, length = final.length; i < length; i++) {
                        final[i].tracks = data[i].items
                    }
                    response.json(final)
                })
                .catch(error => {
                    console.error(error)
                })
        })
        .catch(error => response.status(500).json(error))
})

module.exports = router