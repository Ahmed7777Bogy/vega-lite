{
  "vconcat": [
    {
      "hconcat": [
        {
          "text": [
            {"signal": "'Average Revenue per Customer'"},
            {"signal": "format(datum.mainValue, ',.0f') + 'K'"}
          ],
          "style": "titleStyle"
        },
        {
          "vconcat": [
            {
              "text": [{"signal": "'+' + datum.pyPct + '%'"}],
              "style": "pyGreen"
            },
            {
              "text": [{"signal": "'-' + datum.plPct + '%'"}],
              "style": "plRed"
            }
          ]
        }
      ]
    },
    {
      "width": 260,
      "height": 70,
      "layer": [
        {
          "mark": {"type": "area", "color": "#D9534F", "opacity": 0.6},
          "encoding": {
            "x": {"field": "Month", "type": "temporal"},
            "y": {"field": "Value", "type": "quantitative"}
          }
        },
        {
          "mark": {"type": "line", "color": "black"},
          "encoding": {
            "x": {"field": "Month", "type": "temporal"},
            "y": {"field": "Value", "type": "quantitative"}
          }
        }
      ]
    }
  ],
  "datasets": {
    "table":  []
  }
}
