const audio = require('./lib/audio')
App({ onShow() { audio.setForeground(true) }, onHide() { audio.setForeground(false) } })
