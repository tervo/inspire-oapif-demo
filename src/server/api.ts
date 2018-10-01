import {Server} from './server';
import {Link, Collection, Query} from 'sofp-lib';

import * as _ from 'lodash';
import * as express from 'express';

/**
 * The API class provides accessors to produce metadata for the WFS 3.0 API. The API class wraps a Server object 
 * and uses the data and configuration within that object to produce responses.
 **/

export interface APIResponse {
    links?: Link[],
    collections?: Collection[]
};

export interface RequestParameters {
    baseUrl : string;
    query? : Map<string, string>;
    body? : Buffer;
};

export interface APIParameters {
    title?: string;
    contextPath?: string;
}

export class API {
    server : Server;

    title : string;
    contextPath : string;

    constructor(server : Server, params : APIParameters) {
        this.server = server;
        this.title = params.title;
        this.contextPath = params.contextPath || '';

        if (this.contextPath.charAt(0) !== '/') {
            this.contextPath = '/' + this.contextPath;
        }
        if (this.contextPath.charAt(this.contextPath.length-1) !== '/') {
            this.contextPath = this.contextPath + '/';
        }
    }

    connectExpress(app: express) : void {
        let getBaseUrl = (req: express.req) : string => {
            let ret = req.protocol + '://' + req.headers.host + this.contextPath;
            while (ret.charAt(ret.length-1) === '/') {
                ret = ret.substr(0, ret.length-1);
            }
            return ret;
        }
        app.get(this.contextPath, (req, res) => {
            let response = this.getApiLandingPage({ baseUrl: getBaseUrl(req) });
            res.json(response);
        });

        app.get(this.contextPath + 'collections', (req, res) => {
            let response = this.getFeatureCollectionsMetadata({ baseUrl: getBaseUrl(req) });
            res.json(response);
        });

        app.get(this.contextPath + 'collections/:name', (req, res, next) => {
            let collection = this.server.getCollection(req.params.name);
            if (!collection) {
                return next();
            }
            
            let response = this.getFeatureCollectionsMetadata({ baseUrl: getBaseUrl(req) }, collection);
            res.json(response);
        });

        app.get(this.contextPath + 'collections/:name/items', (req, res, next) => {
            let collection = this.server.getCollection(req.params.name);
            if (!collection) {
                return next();
            }
            
            //let query = this.parseQuery(req);
            let query : Query = { filters: [] };

            res.writeHead(200, { 'Content-Type': 'application/json' });

            var n = 0;
            res.write('{\n');
            res.write('\t"type": "FeatureCollection",\n');
            res.write('\t"features": [');
            var stream = collection.executeQuery(query);
            stream.on('data', (d) => {
                if (n > 0) {
                    res.write(',');
                }
                var json = JSON.stringify(d, null, '\t');
                json = json.replace(/^\t/gm, '\t\t');
                json = json.substring(0,json.length-1)+'\t}';
                res.write(json);
                n++;
            });

            stream.on('end', () => {
                res.write('],\n');
                res.write('\t"timestamp": "'+new Date().toISOString()+'",\n');
                res.write('\t"links": ["todo"]\n');
                res.write('\t"numberReturned": '+n+'\n');
                res.write('}\n');
                res.end();
            });
        });

        app.get(this.contextPath + 'conformance', (req, res) => {
            let response = this.getConformancePage({ baseUrl: getBaseUrl(req) });
            res.json(response);
        });
    }

    /**
     * Return object following the WFS 3.0.0 draft 1 specification for api landing page
     *
     * @link https://cdn.rawgit.com/opengeospatial/WFS_FES/3.0.0-draft.1/docs/17-069.html#_api_landing_page
     **/
    getApiLandingPage(params : RequestParameters) : APIResponse {
        return {
            links: [{
                href: params.baseUrl + '/',
                rel: 'self',
                type: 'application/json',
                title: this.title
            },{
                href: params.baseUrl + '/api',
                rel: 'service',
                type: 'application/openapi+json;version=3.0',
                title: 'the API definition',
            },{
                href: params.baseUrl + '/conformance',
                rel: 'conformance',
                type: 'application/json',
                title: 'WFS 3.0 conformance classes implemented by this server'
            },{
                href: params.baseUrl + '/collections',
                rel: 'data',
                type: 'application/json',
                title: 'Metadata about the feature collections'
            }]
        };
    }

    /**
     * Return object following the WFS 3.0.0 draft 1 specification for feature collections metadata
     * @link https://cdn.rawgit.com/opengeospatial/WFS_FES/3.0.0-draft.1/docs/17-069.html#_feature_collections_metadata
     */ 
    getFeatureCollectionsMetadata(params : RequestParameters, collection? : Collection) : APIResponse {
        var collections = collection ? [ collection ] : this.server.getCollections();
        collections = _.cloneDeep(collections);

        let ret : APIResponse = {
            links: [{
                href: params.baseUrl + '/collections',
                rel: 'self',
                type: 'application/json',
                title: 'Metadata about the feature collections'
            }],
            collections: collections
        };

        _.each(collections, (collection) => {
            collection.links.unshift({
                href: params.baseUrl + '/collections/'+collection.name+'/items',
                rel: 'item',
                type: 'application/json'
            });
        });

        return ret;
    }

    getConformancePage(params : RequestParameters) : object {
        // TODO: this is still a lie, but we're getting there..
        return {
            conformsTo: [
                'http://www.opengis.net/spec/wfs-1/3.0/req/core',
                'http://www.opengis.net/spec/wfs-1/3.0/req/oas30',
                'http://www.opengis.net/spec/wfs-1/3.0/req/geojson' ]
        };
    }
};

