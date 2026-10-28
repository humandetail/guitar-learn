const { parts } = require('../../data/content')
Component({
  options: { styleIsolation: 'apply-shared' },
  properties: { kind: { type: String, observer() { if (this._ready) this.draw() } } },
  data: { parts, selected: parts[0], strings: ['6 弦 · 最粗 · E2', '5 弦 · A2', '4 弦 · D3', '3 弦 · G3', '2 弦 · B3', '1 弦 · 最细 · E4'] },
  lifetimes: { ready() { this._ready = true; this.draw() } },
  methods: {
    select(event) { const part = parts.find(item => item.id === event.currentTarget.dataset.id); if (part) this.setData({ selected: part }, () => this.draw()) },
    draw() {
      if (this.data.kind !== 'anatomy') return
      const ctx = wx.createCanvasContext('guitar-anatomy', this)
      ctx.clearRect(0, 0, 220, 410); ctx.translate(-60, -5)
      ctx.setFillStyle('#e4eaff'); ctx.setStrokeStyle('#8c9ebd'); ctx.setLineWidth(2)
      ctx.beginPath(); ctx.moveTo(150, 205)
      const curves = [[122,191,95,210,96,237],[97,254,116,263,111,279],[105,296,78,310,80,346],[82,386,121,405,170,405],[219,405,258,386,260,346],[262,310,235,296,229,279],[224,263,243,254,244,237],[245,210,218,191,190,205]]
      curves.forEach(c => ctx.bezierCurveTo(...c)); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.setFillStyle('#cbd5e7'); ctx.fillRect(151, 27, 38, 58); ctx.fillRect(151, 80, 38, 155)
      ctx.setFillStyle('#7787a2'); ctx.fillRect(155, 86, 30, 162)
      ctx.setStrokeStyle('#e9eef5'); ctx.setLineWidth(2)
      ;[108,125,140,154,167,179,190,200,210,219,228,237].forEach(y => { ctx.beginPath(); ctx.moveTo(155,y); ctx.lineTo(185,y); ctx.stroke() })
      ctx.setFillStyle('#a6b4ce'); ctx.beginPath(); ctx.arc(170,273,34,0,2*Math.PI); ctx.fill()
      ctx.setFillStyle('#26334a'); ctx.beginPath(); ctx.arc(170,273,28,0,2*Math.PI); ctx.fill()
      ctx.setFillStyle('#7787a2'); ctx.fillRect(126,334,88,22)
      ctx.setFillStyle('#f1f4f8'); ctx.fillRect(152,83,36,5); ctx.fillRect(152,339,36,5)
      ctx.setStrokeStyle('#59677e'); [39,54,69].forEach(y => { ctx.beginPath(); ctx.moveTo(139,y); ctx.lineTo(201,y); ctx.stroke(); ctx.setFillStyle('#cbd5e7'); ctx.fillRect(132,y-4,10,8); ctx.fillRect(198,y-4,10,8) })
      ctx.setStrokeStyle('#f1f4f8')
      for (let i=0;i<6;i++) { ctx.setLineWidth(1.8-i*0.18); ctx.beginPath(); ctx.moveTo(158+i*4.8,85); ctx.lineTo(155+i*6,349); ctx.stroke() }
      ctx.setFillStyle('#254dff'); ctx.beginPath(); ctx.arc(this.data.selected.point[0],this.data.selected.point[1],6,0,2*Math.PI); ctx.fill()
      ctx.draw()
    },
  },
})
