import * as fs from 'fs';
import * as _ from 'lodash';

const css = fs.readFileSync(__dirname + '/../../assets/json2html.css');

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function produceBody(title, data) {
    var ret = '';

    ret += `<h1>${escapeXml(title)}</h1>`;
    if (data.description) {
    	ret += `<p>${data.description}</p>`;
    }

    if (data.collections) {
        ret += '<h2>Collections</h2>';
        ret += _.map(data.collections, c => {
            var tmp = '';
            if (c.title) {
                tmp += `<h3>${c.title} (${c.id})</h3>`;
            } else {
                tmp += `<h3>${c.id}</h3>`;
            }
            tmp += `<p>${c.description}</p>`;
            tmp += `<h4>Links for the collection</h4>`;
            tmp += _.map(c.links, l => {
                return `<p>${l.rel} = <a href="${l.href}">${l.title || '(no title)'}</a> (${l.type})</p>`;
            }).join('');

            if (c.extent) {
              tmp += '<h2>Extent</h2>';
              if (c.extent.spatial) {
                tmp += '<p>Spatial =  '+c.extent.spatial.bbox+'<p>';
              }
              if (c.extent.temporal && c.extent.temporal.interval) {
                console.debug(c.extent.temporal)
                 tmp += '<p>Temporal = '+c.extent.temporal.interval+'<p>'
              }
            }
            return tmp;
        } ).join('');
    }

    if (data.conformsTo) {
        ret += '<h2>Conforms to</h2>';
        ret += _.map(data.conformsTo, c => {
            return `<p>${c}</p>`;
        } ).join('');
    }

    var selfLink;
    if (data.links) {
        ret += '<h2>Links</h2>';
        ret += _.map(data.links, l => {
            if (l.rel === 'self') {
                selfLink = l;
            }
            return `<p>${l.rel} = <a href="${l.href}">${l.title || '(no title)'}</a> (${l.type})</p>`;
        } ).join('');
    }

    if (data.type === 'FeatureCollection') {
        ret += '<h2>Features</h2>';
        ret += '<div id="mapid"></div>';

    }

    ret += '<h2>JSON output</h2>';

    if (selfLink) {
        var tmp = selfLink.href;
        if (tmp.indexOf('?') === -1) {
            tmp += '?f=json';
        } else {
            tmp += '&f=json';
        }
        ret += `<p>Get raw <a href="${tmp}">JSON</a></p>`;
    }

    ret += '<div id="jsonContainer"></div>';
    ret += '<script>'
    ret += 'var jsonData = '+JSON.stringify(data, null, 2)+';';
    ret += 'renderjson.set_icons("+", "-");';
    ret += 'renderjson.set_show_to_level(3);';
    ret += 'document.getElementById("jsonContainer").appendChild(renderjson(jsonData));';
    ret += '</script>'

    return ret;
}

export function json2html(data, extraOptions?) {
    if (extraOptions === undefined) {
        extraOptions = {};
    }

    var html = '<!DOCTYPE html><html>';

    var title = null;
    var self = _.find(data.links, { rel : 'self'});
    if (self && self['title']) {
        title = self['title'];
    }
    if (extraOptions.title) {
        title = extraOptions.title;
    }
    if (title === null || title === undefined) {
        title = '??';
    }

    html += '<head>';
    html += `<title>${escapeXml(title)}</title>`;
    html += '<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans:300,300italic,400,400italic,600,600italic%7CNoto+Serif:400,400italic,700,700italic%7CDroid+Sans+Mono:400,700">';
    html += '<script src="https://cdn.jsdelivr.net/npm/renderjson@1.4.0/renderjson.min.js"></script>';

    if (data.type === 'FeatureCollection') {

        html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.4.0/leaflet.css">';

        html += '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>';
        html += '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.4.0/leaflet.js"></script>';

        html += '<script>'+
        'function popup(evt) {'+
        '  var ret = $.map(evt.feature.properties, (v, k) => `<td>${k}</td><td>${v}</td>`);'+
        '  return "<table><tr>"+ret.join("</tr><tr>")+"</tr></table>";'+
        '}'+
        '$(document).ready(function() {'+
            'var features = '+JSON.stringify(data)+';'+
            'var mymap = L.map("mapid");' +
            'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {'+
            '    attribution: "&copy; <a href=\\"https://www.openstreetmap.org/copyright\\">OpenStreetMap</a> contributors"'+
            '}).addTo(mymap);'+
            'var featureLayer = L.geoJSON(features);'+
            'featureLayer.bindPopup(popup);'+
            'featureLayer.addTo(mymap);'+
            'mymap.fitBounds(featureLayer.getBounds());'+
        '});</script>';
    }

    html += `<style>${css}</style>`;
    html += '</head>';

    html += '<body>';
    html += '<div id="content">';

    html += produceBody(title, data);

    html += '</div>';
    html += '</body>';

    html += '</html>';

    return html;
}
