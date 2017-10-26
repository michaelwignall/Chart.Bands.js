/*!
 * Chart.bands.js
 * Version: v0.4.0-rc
 *
 * Copyright 2016 BBC
 * Released under the MIT license
 * https://github.com/BBC/Chart.bands.js/blob/master/LICENSE.md
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var Chart, helpers, supportedTypes, addLegendColourHelper, isSupported, colourProfile, defaultOptions;

//setup
Chart = require('Chart');
Chart = typeof(Chart) === 'function' ? Chart : window.Chart;
helpers = Chart.helpers;
isSupported = true;
colourProfile = 'borderColor';
baseColor = [];

supportedTypes = {
    'bubble': 'backgroundColor',
    'line': 'borderColor'
};
addLegendColourHelper = {
    'borderColor': 'backgroundColor',
    'backgroundColor': 'borderColor'
};
Chart.Bands = Chart.Bands || {};

defaultOptions = Chart.Bands.defaults = {
    bands: {
        from: 0,
        to: 0,
        yValue: false,
        bandLine: {
            stroke: 0.01,
            colour: 'rgba(0, 0, 0, 1.000)',
            type: 'solid',
            label: '',
            fontSize: '12',
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            fontStyle: 'normal'
        },
        color: [
            'rgba(0, 255, 0, 1.000)'
        ]
    }
};

function addBandLine (ctx, scale, constraints, options) {
    var yPos = scale.getPixelForValue(options.yValue),
        bandLine = options.bandLine;

    if (bandLine.type === 'dashed') {
        for (var i = constraints.start; i < constraints.stop; i = i + 6) {
            drawBandLine(ctx, yPos, i, i + 4, bandLine.stroke, bandLine.colour);
        }
    } else {
        drawBandLine(ctx, yPos, constraints.start, constraints.stop, bandLine.stroke, bandLine.colour);
    }

    if(bandLine.label !== undefined && bandLine.label.length > 0) {

        addBandLineLabel(
            ctx,
            bandLine,
            {
                'x': constraints.start,
                'y': constraints.top - options.bandLine.fontSize * 2
            }
        );
    }
}

function drawBandLine (ctx, yPos, start, stop, stroke, colour) {
    ctx.beginPath();
    ctx.moveTo(start, yPos);
    ctx.lineTo(stop, yPos);
    ctx.lineWidth = stroke;
    ctx.strokeStyle = colour;
    ctx.stroke();
}

function addBandLineLabel (ctx, options, position) {
    ctx.font = helpers.fontString(options.fontSize, options.fontStyle, options.fontFamily);
    ctx.fillStyle = options.colour;
    ctx.fillText(options.label, position.x, position.y);
    if (options.type === 'dashed') {
        for (var i = 10; i < position.x - 10; i = i + 6) {
            drawBandLine(ctx, (position.y + options.fontSize * 0.5), i, i + 4, options.stroke, options.colour);
        }
    } else {
        drawBandLine(ctx, position.y, 10, position.x - 10, options.stroke, options.colour);
    }
}

function pluginBandOptionsHaveBeenSet (bandOptions) {
    // return (typeof bandOptions.color === 'object' && bandOptions.color.length > 0 && typeof bandOptions.yValue === 'number');
    return (typeof bandOptions.color === 'string');
}

function calculateGradientFill (ctx, scale, height, baseColor, bands) {
    // figure out the position of all the stops
    var stops = [];

    for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        var bandOptions = helpers.configMerge(Chart.Bands.defaults.bands, band);

        if (!pluginBandOptionsHaveBeenSet(bandOptions)) {
            console.warn('ConfigError: The Chart.Bands.js config seems incorrect');
            return;
        }

        var fromY = scale.getPixelForValue(band.from);
        var toY = scale.getPixelForValue(band.to);
        var fromStop = 1 - (fromY / height);
        var toStop = 1 - (toY / height);

        stops.push({
            pos: fromStop,
            colour: bandOptions.color
        });

        stops.push({
            pos: toStop,
            colour: bandOptions.color
        });
    }

    window.stops = stops;

    // add stops to the gradient
    var error = false;
    try {
        var grd = ctx.createLinearGradient(0, height, 0, 0);
        
        for (var i = 0; i < stops.length; i++) {
            var stop = stops[i];
            grd.addColorStop(stop.pos, stop.colour);
        }

        grd.addColorStop(1.00, baseColor);

    } catch (e) {
        console.warn('ConfigError: Chart.Bands.js had a problem applying one or more colors please check that you have selected valid color strings');
        error = true;
    }

    return error ? baseColor : grd;
}

function isPluginSupported (type) {

    if (!!supportedTypes[type]) {
        colourProfile = supportedTypes[type];
        return;
    }
    console.warn('Warning: The Chart.Bands.js plugin is not supported with chart type ' + type);
    isSupported = false;
}

var BandsPlugin = Chart.PluginBase.extend({
    beforeInit: function (chartInstance) {
        isPluginSupported(chartInstance.config.type);
        // capture the baseColors so we can reapply on resize.
        for (var i = 0; i < chartInstance.chart.config.data.datasets.length; i++) {
            baseColor[i] = chartInstance.chart.config.data.datasets[i][colourProfile]; 
        }
    },

    afterScaleUpdate: function (chartInstance) {
        var node,
            bandOptions,
            fill;

        if(isSupported === false) { return ; }

        node = chartInstance.chart.ctx.canvas;

        for (var i = 0; i < chartInstance.chart.config.data.datasets.length; i++) {
            fill = calculateGradientFill(
                                    node.getContext("2d"),
                                    chartInstance.scales['y-axis-0'],
                                    chartInstance.chart.height,
                                    baseColor[i],
                                    chartInstance.options.bands
                                );
            chartInstance.chart.config.data.datasets[i][colourProfile] = fill;
        }
    },

    afterDraw: function(chartInstance) {
        var node,
            bandOptions;

        if(isSupported === false) { return ;}

        node = chartInstance.chart.ctx.canvas;

        for (var i = chartInstance.options.bands.length - 1; i >= 0; i--) {
            var band = chartInstance.options.bands[i];

            bandOptions = helpers.configMerge(Chart.Bands.defaults.bands, band);

            if (typeof bandOptions.yValue === 'number') {
                addBandLine(
                    node.getContext("2d"),
                    chartInstance.scales['y-axis-0'],
                    {
                        'top': chartInstance.chartArea.top,
                        'start': chartInstance.chartArea.left,
                        'stop': chartInstance.chartArea.right,
                    },
                    bandOptions
                );

            } else {
                console.warn('ConfigError: The Chart.Bands.js plugin config requires a yValue');
            }
        }

    }
});

Chart.pluginService.register(new BandsPlugin());
},{"Chart":1}]},{},[2]);
