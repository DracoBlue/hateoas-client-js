/*
 * Copyright (c) 2011-2015 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

if (typeof window === 'undefined') { /* Running in NodeJS */
	var domino = require('domino');
	var $ = require('jquery')(domino.createWindow());
	var jQuery = $;
	var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
	$.support.cors=true; // cross domain
	$.ajaxSettings.xhr = function() {
		return new XMLHttpRequest();
	};
}

NotOkHttpResponse = function() {
    
};

NotOkHttpResponse.prototype.isOk = function() {
    return false;
};

HttpAgent = function(url, headers, options) {
    this.url = url;
    this.default_headers = headers || {};
    this.navigation_steps = [];
    this.options = options || {};
	this.logDebug('initialized', url);
};

HttpAgent.prototype.clone = function() {
    var clone = new HttpAgent(this.url);
    clone.default_headers = jQuery.extend(true, {}, this.default_headers);
    clone.navigation_steps = jQuery.extend(true, [], this.navigation_steps);
    return clone;
};

HttpAgent.enableLogging = false;

HttpAgent.prototype.logDebug = function() {
	if (HttpAgent.enableLogging)
	{
		if (typeof this.uniqueId === "undefined") {
			this.uniqueId = (global.httpAgentNextUniqueLoggingId || 1);
			global.httpAgentNextUniqueLoggingId = this.uniqueId + 1;
		}
		var parameters = Array.prototype.slice.apply(arguments, [0]);
		parameters.unshift('[HttpAgent#' + this.uniqueId + ']');
		console.log.apply(console, parameters);
	}
};

HttpAgent.prototype.logTrace = function() {
	if (HttpAgent.enableLogging)
	{
		if (typeof this.uniqueId === "undefined") {
			this.uniqueId = (global.httpAgentNextUniqueLoggingId || 1);
			global.httpAgentNextUniqueLoggingId = this.uniqueId + 1;
		}
		var parameters = Array.prototype.slice.apply(arguments, [0]);
		var methodName = parameters.shift();
		parameters.unshift('[HttpAgent.' + methodName + '#' + this.uniqueId + ']');
		console.log.apply(console, parameters);
	}
};

HttpAgent.prototype.getUrl = function()
{
    return this.url;
};

HttpAgent.prototype.getBaseUrl = function()
{
	var match = this.url.match(/^(.+?[\/]+?.+?)\//);
	if (match)
	{
		return match[1];
	}

	return '';
};

HttpAgent.prototype.rawCall = function(cb, verb, params, headers) {
    var that = this;
    
    headers = headers || {};
    var url = that.url;
    
    if (this.options.proxy_script) {
        url = this.options.proxy_script + encodeURIComponent(url);
    }

	this.logTrace('rawCall', verb, that.url, params);
	
    jQuery.ajax(jQuery.extend((this.options.ajaxOptions || {}), {
        beforeSend: function(xhrObj){
            for (var header in that.default_headers)
                xhrObj.setRequestHeader(header, that.default_headers[header]);
            for (var header in headers)
                xhrObj.setRequestHeader(header, headers[header]);
            return xhrObj;
        },        
        url: url,
        dataType: 'text',
        type: verb,
        data: params || {},
        complete: function(response) {
			that.logDebug('status', response.status);
			that.logDebug('response', (response.responseText || '').substr(0, 255));
            if (response.status === 201) {
				var absolute_href = response.getResponseHeader('Location');
				if (absolute_href.substr(0, 1) == '/')
				{
					absolute_href = that.getBaseUrl() + absolute_href;
				}
				that.url = absolute_href;
                that.rawCall(cb, 'GET', {}, headers);
            } else if (response.status === 204) {
                cb(new NoContentResponse(response, null, that));
            } else {
                cb(HttpAgent.getHttpResponseByRawResponse(response, that));
            }
        }
    }));
};

HttpAgent.prototype.rawNavigate = function(cb) {
    var that = this;
    var step_position = 0;
    var last_response = null;
    
    var performNextStep = function() {
        if (step_position === that.navigation_steps.length) {
            that.navigation_steps = [];
            cb(last_response);
            return ;
        }
        
        that.rawCall(function(current_response) {
            last_response = current_response;
            if (!current_response.isOk()) {
                cb(current_response);
                return ;
            }
            
            var next_step = that.navigation_steps[step_position];
            
            if (typeof next_step !== 'string') {
                step_position += 1;
                current_response = current_response.getMatchingValue(next_step);
            }
            
            var link_name = that.navigation_steps[step_position];
            
            if (link_name === '*') {
                step_position++;
                var filter_object = that.navigation_steps[step_position];
                
                that.rawBreadthFirstSearch(function(next_step_entry_point, last_search_response) {
                    last_response = last_search_response;
                    if (!next_step_entry_point) {
                        cb(new NotOkHttpResponse());
                        return ;
                    }
                    that.url = next_step_entry_point.url;
                    step_position++;
                    performNextStep();
                }, filter_object);
            } else {
                var next_step_entry_point = null;
                try {
                    next_step_entry_point = current_response.getLink(link_name);
                } catch (error) {
                    cb(new NotOkHttpResponse());
                    return;
                }
                that.url = next_step_entry_point.url;
                
                step_position++;
                performNextStep();
            }
        }, 'GET');
    };
    
    performNextStep();
};

HttpAgent.prototype.rawBreadthFirstSearch = function(cb, filter_object) {
    var url_was_in_frontier = {};
    url_was_in_frontier[this.url] = true;
    
    var frontier = [this.url];
    var frontier_length = frontier.length;
    var tmp_entry_point = new HttpAgent(this.url);

    var new_frontier = [];
    
    var step_position = 0;
    
    var performIteration = function() {
        if (step_position === frontier_length && new_frontier.length === 0) {
            cb(null, new NotOkHttpResponse());
            return ;
        }

        if (step_position === frontier_length) {
            step_position = 0;
            frontier = new_frontier;
            frontier_length = frontier.length;
            new_frontier = [];
        }
        
        tmp_entry_point.url = frontier[step_position];
        tmp_entry_point.rawCall(function(response) {
            /*
             * Was this response ok?
             */
            if (response.isOk()) {
                var links = response.getLinks();
                
                if (typeof filter_object === "string" && typeof links[filter_object] !== 'undefined') {
                    /*
                     * YES!
                     */
                    cb(links[filter_object][0], response);
                    return ;
                }

				if (typeof filter_object === "function") {
					if (filter_object(response))
					{
						cb(tmp_entry_point.clone(), response);
						return ;
					}
				}
                
                if (typeof filter_object !== "string") {
                    try {
                        var matching_value = response.getMatchingValue(filter_object);
                        cb(tmp_entry_point.clone(), response);
                        return ;
                    } catch (error) {
                        /*
                         * We'll continue, if that object didn't match
                         */
                    }
                }
                
                jQuery.each(links, function(pos, link_targets) {
                    jQuery.each(link_targets, function(sub_pos, link) {
                        if (!url_was_in_frontier[link.url]) {
                            new_frontier.push(link.url);
                            url_was_in_frontier[link.url] = true;
                        }
                    });
                });
            }
            
            /*
             * Continue with next element in the frontier!
             */
            step_position++;
            performIteration();
        }, 'GET');
    };
    
    performIteration();
};


HttpAgent.prototype.call = function(cb, verb, params, headers) {
    var that = this;
    if (this.navigation_steps.length === 0) {
        this.rawCall(cb, verb, params, headers);
    } else {
        this.rawNavigate(function(navigation_response) {
            if (navigation_response.isOk()) {
                that.rawCall(cb, verb, params, headers);
            } else {
                cb(navigation_response);
            }
        });
    }
};

HttpAgent.prototype.get = function(cb, params, headers) {
    this.call(cb, 'GET', params, headers || {});
};

HttpAgent.prototype.post = function(cb, params, headers) {
    this.call(cb, 'POST', params, headers || {});
};

HttpAgent.prototype['delete'] = function(cb, params, headers) {
    this.call(cb, 'DELETE', params, headers || {});
};

HttpAgent.prototype.put = function(cb, params, headers) {
    this.call(cb, 'PUT', params, headers || {});
};

HttpAgent.prototype.patch = function(cb, params, headers) {
    this.call(cb, 'PATCH', params, headers || {});
};

HttpAgent.prototype.head = function(cb, params, headers) {
    this.call(cb, 'HEAD', params, headers || {});
};

HttpAgent.prototype.navigate = function(steps) {
    if (typeof steps === 'string') {
        this.addNavigationStep(steps);
    } else {
        var steps_length = steps.length;
        for (var i = 0; i < steps_length; i++) {
            this.addNavigationStep(steps[i]);
        }
    }
    return this;
};

HttpAgent.prototype.addNavigationStep = function(step) {
    this.navigation_steps.push(step);
};

HttpAgent.response_content_types = [];

HttpAgent.registerResponseContentTypes = function(content_types, converter_class) {
    this.response_content_types.push([content_types, converter_class]);
};
        
HttpAgent.getHttpResponseByRawResponse = function(raw_response, agent) {
	agent.logTrace('getHttpResponseByRawResponse', raw_response, agent);
    var content_type = (raw_response.getResponseHeader('content-type') || '').toLowerCase().split(';')[0];
	agent.logDebug('content type', content_type);
    var response_content_types = this.response_content_types;
    var response_content_types_length = response_content_types.length;
    for (var i = 0; i < response_content_types_length; i++) {
        if (response_content_types[i][0].indexOf(content_type) !== -1) {
            var converter_class = response_content_types[i][1];
			agent.logDebug('converter', converter_class);
            return new converter_class(raw_response, null, agent);
        }
    }

	return new UnsupportedMediaTypeHttpResponse();
};

HttpLink = function(link_data, url, headers, options) {
    this.url = url;
    this.default_headers = headers || {};
    this.navigation_steps = [];
    this.options = options || {};
    this.link_data = link_data;
};

jQuery.extend(HttpLink.prototype, HttpAgent.prototype);

HttpLink.prototype.getRel = function() {
    return this.link_data['rel'];
};

HttpLink.prototype.getTitle = function() {
    return this.link_data['title'];
};

HttpLink.prototype.getType = function() {
    return this.link_data['type'];
};

BaseHttpResponse = function() {
    
};

BaseHttpResponse.prototype.isOk = function() {
    return 200 === this.getStatusCode() ? true : false;
};

BaseHttpResponse.prototype.getStatusCode = function() {
    return this.xhr.status;
};

BaseHttpResponse.prototype.getHeader = function(name, default_value) {
    return this.xhr.getResponseHeader(name) || default_value;
};

BaseHttpResponse.prototype.getAllHeaders = function() {
    var headers = {};
    var rawHeaders = this.xhr.getAllResponseHeaders();
    var extractHeadersRegExp = /^([^:]+):\s+(.+)$/mg;
    var match;

    while ((match = extractHeadersRegExp.exec(rawHeaders)) !== null) {
        headers[match[1].trim()] = match[2].trim();
    }

    return headers;
};

BaseHttpResponse.prototype.getLink = function(link_name) {
    var links = this.getLinks();
    if (typeof links[link_name] === 'undefined') {
        throw new Error('Cannot find link with name: ' + link_name);
    }
    return links[link_name][0];
};

NoContentResponse = function(xhr, value, agent) {
    this.xhr = xhr;
    this.agent = agent;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
};

jQuery.extend(NoContentResponse.prototype, BaseHttpResponse.prototype);


NoContentResponse.prototype.isOk = function() {
    return true;
};

NoContentResponse.prototype.getLinks = function() {
    return {};
};

NoContentResponse.prototype.getValue = function() {
    return ;
};

JsonHttpResponse = function(xhr, value, agent) {
    this.xhr = xhr;
	this.agent = agent;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
	agent.logDebug('initialized JsonHttpResponse');
};

jQuery.extend(JsonHttpResponse.prototype, BaseHttpResponse.prototype);

JsonHttpResponse.prototype.getValue = function() {
    if (!this.value) {
        this.value = jQuery.parseJSON(this.xhr.responseText);
    }
    
    return this.value;
};

JsonHttpResponse.prototype.at = function(pos) {
    var values = this.getValues();
    return values[pos];
};

JsonHttpResponse.prototype.getValues = function() {
    if (!this.values) {
        var value_entry_points = [];

        var values = this.getValue(this.xhr);
        var values_length = values.length;

        for (var i = 0; i < values_length; i++) {
            value_entry_points.push(new JsonHttpResponse(this.xhr, values[i], this.agent));
        }
        
        this.values = value_entry_points;
    }
    
    return this.values;
};

JsonHttpResponse.prototype.getMatchingValue = function(filter_object) {
    var values = this.getValue();
    
    /*
     * FIXME: An old man's check, whether what we've got here is an array or not
     */
    if (typeof values !== "object" || typeof values.join !== "function") {
        values = [values];
    }
    
    var values_length = values.length;
    
    for (var i = 0; i < values_length; i++) {
        var value = values[i];
        var is_match = true;
        if (typeof filter_object === 'function') {
            is_match = filter_object(value);
        } else {
            for (key in filter_object) {
                if (filter_object.hasOwnProperty(key) && filter_object[key] !== value[key]) {
                    is_match = false;
                }
            }
        }
        
        if (is_match) {
            return new JsonHttpResponse(this.xhr, value, this.agent);
        }
    }
    
    throw new Error('No matching value found for filter object');
};

JsonHttpResponse.prototype.getLinks = function() {
    if (this.links_map) {
        return this.links_map;
    }
    
    var value = this.getValue();
    var links = [];

    if (value.hasOwnProperty('links')) {
        links = jQuery.extend(true, links, value['links']);
    }
    
    if (value.hasOwnProperty('link')) {
        links.push(value['link']);
    }
    
    var links_map = {};
    var links_length = links.length;
    
    for (var i = 0; i < links_length; i++) {
        var link = links[i];
        var headers = {};
        if (link.type) {
            headers['Content-Type'] = link.type;
        }
        links_map[link.rel] = links_map[link.rel] || [];
		var absolute_href = link.href;
		if (absolute_href.substr(0, 1) == '/')
		{
			absolute_href = this.agent.getBaseUrl() + absolute_href;
		}
        links_map[link.rel].push(new HttpLink({"rel": link.rel, "type": link.type},absolute_href, headers));
    }
    
    this.links_map = links_map;
    return this.links_map;
};

HttpAgent.registerResponseContentTypes(['application/json'], JsonHttpResponse);

JsonHalHttpResponse = function(xhr, value, agent) {
    this.xhr = xhr;
	this.agent = agent;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
};

jQuery.extend(JsonHalHttpResponse.prototype, BaseHttpResponse.prototype);

JsonHalHttpResponse.prototype.getValue = function() {
    if (!this.value) {
        this.value = jQuery.parseJSON(this.xhr.responseText);
    }

    return this.value;
};

JsonHalHttpResponse.prototype.at = function(pos) {
    var values = this.getValues();
    return values[pos];
};

JsonHalHttpResponse.prototype.getValues = function() {
    if (!this.values) {
        var value_entry_points = [];

        var value = this.getValue(this.xhr);

        var embedded_objects_map = {};

        if (value.hasOwnProperty('_embedded')) {
            embedded_objects_map = jQuery.extend(true, {}, value['_embedded']);
        }

        for (var rel in embedded_objects_map)
        {
            if (embedded_objects_map.hasOwnProperty(rel))
            {
                var embedded_objects = embedded_objects_map[rel];

                /*
                 * FIXME: An old man's check, whether what we've got here is an array or not
                 */
                if (typeof embedded_objects !== "object" || typeof embedded_objects.join !== "function") {
                    embedded_objects = [embedded_objects];
                }

                var embedded_objects_length = embedded_objects.length;

                for (var i = 0; i < embedded_objects_length; i++)
                {
                    value_entry_points.push(new JsonHalHttpResponse(this.xhr, embedded_objects[i], this.agent));
                }
            }
        }

        this.values = value_entry_points;
    }

    return this.values;
};

JsonHalHttpResponse.prototype.getMatchingValue = function(filter_object) {
    var values = this.getValues();

    var values_length = values.length;

    for (var i = 0; i < values_length; i++) {
        var value = values[i].getValue();
        var is_match = true;
        if (typeof filter_object === 'function') {
            is_match = filter_object(value);
        } else {
            for (key in filter_object) {
                if (filter_object.hasOwnProperty(key) && filter_object[key] !== value[key]) {
                    is_match = false;
                }
            }
        }

        if (is_match) {
            return new JsonHalHttpResponse(this.xhr, value, this.agent);
        }
    }

    throw new Error('No matching value found for filter object');
};

JsonHalHttpResponse.prototype.getLinks = function() {
    if (this.links_map) {
        return this.links_map;
    }

    var value = this.getValue();
    var links_map = {};
    var raw_links_map = {};

    if (value.hasOwnProperty('_links')) {
        raw_links_map = jQuery.extend(true, raw_links_map, value['_links']);
    }

    for (var rel in raw_links_map)
    {
        if (raw_links_map.hasOwnProperty(rel))
        {
            var raw_links = raw_links_map[rel];

            /*
             * FIXME: An old man's check, whether what we've got here is an array or not
             */
            if (typeof raw_links !== "object" || typeof raw_links.join !== "function") {
                raw_links = [raw_links];
            }

            var raw_links_length = raw_links.length;

            for (var i = 0; i < raw_links_length; i++)
            {
                var link = raw_links[i];
                var headers = {};
                /* FIXME: is `type` allowed in HAL? */
                if (link.type) {
                    headers['Content-Type'] = link.type;
                }
                links_map[rel] = links_map[rel] || [];
				var absolute_href = link.href;
				if (absolute_href.substr(0, 1) == '/')
				{
					absolute_href = this.agent.getBaseUrl() + absolute_href;
				}
                links_map[rel].push(new HttpLink({"rel": rel, "type": link.type, "title": link.title}, absolute_href, headers));
            }
        }
    }

    this.links_map = links_map;
    return this.links_map;
};

HttpAgent.registerResponseContentTypes(['application/hal+json'], JsonHalHttpResponse);


AtomXmlHttpResponse = function(xhr, value, agent) {
    this.xhr = xhr;
	this.agent = agent;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
};

jQuery.extend(AtomXmlHttpResponse.prototype, BaseHttpResponse.prototype);

AtomXmlHttpResponse.prototype.getValue = function() {
    if (!this.value) {
        this.value = this.xhr.responseXML.childNodes[0];
    }
    return this.value;
};

AtomXmlHttpResponse.prototype.getValues = function() {
    var that = this;
    
    if (!this.values) {
        var value = this.getValue();
        
        this.values = [];
        
        var entries = jQuery(this.getValue()).children('entry');
        jQuery.each(entries, function(pos, raw_entry) {
            that.values.push(new AtomXmlHttpResponse(that.xhr, raw_entry, that.agent));
        });
    }
    
    return this.values;
};

AtomXmlHttpResponse.prototype.getMatchingValue = function(filter_object) {
    var value_entry_points = [];
    
    var entries = jQuery(this.getValue()).children('entry');
    var entries_length = entries.length;
    
    for (var i = 0; i < entries_length; i++) {
        var raw_entry = entries[i];
        var value = new AtomXmlHttpResponse(this.xhr, raw_entry, this.agent);
        var is_match = true;
        if (typeof filter_object === 'function') {
            is_match = filter_object(value);
        } else {
            for (key in filter_object) {
                if (filter_object.hasOwnProperty(key) && jQuery(raw_entry).find(key).text() != filter_object[key]) {
                    is_match = false;
                }
            }
        }
        
        if (is_match) {
            return value;
        }
    }
    
    throw new Error('No matching value found for filter object');
};

AtomXmlHttpResponse.prototype.getLinks = function() {
    if (this.links_map) {
        return this.links_map;
    }
    
    var links_map = {};
    var links = jQuery(this.getValue()).children('link');
    jQuery.each(links, function(pos, raw_link) {
        var headers = {};
        var link = jQuery(raw_link);
        var rel = link.attr('rel');
        if (link.attr('type')) {
            headers['Content-Type'] = link.attr('type');
        }
        links_map[rel] = links_map[rel] || [];
		var absolute_href = link.attr('href');
		if (absolute_href.substr(0, 1) == '/')
		{
			absolute_href = this.agent.getBaseUrl() + absolute_href;
		}
		links_map[rel].push(new HttpLink({"rel": rel, "type": link.attr('type')}, absolute_href, headers));
    });
    
    this.links_map = links_map;
    return this.links_map;
};

HttpAgent.registerResponseContentTypes(['application/atom+xml'], AtomXmlHttpResponse);

XmlHttpResponse = function(xhr, value, agent) {
    this.xhr = xhr;
	this.agent = agent;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
};

jQuery.extend(XmlHttpResponse.prototype, BaseHttpResponse.prototype);

XmlHttpResponse.prototype.getValue = function() {
    if (!this.value) {
        this.value = this.xhr.responseXML;
    }
    
    return this.value;
};

XmlHttpResponse.prototype.getLinks = function() {
	/* FIXME: not yet implemented */
	return {};
};

UnsupportedMediaTypeHttpResponse = function() {

};

UnsupportedMediaTypeHttpResponse.prototype.isOk = function() {
	return false;
};

HttpAgent.registerResponseContentTypes(['text/html', 'application/xml'], XmlHttpResponse);

if (typeof define !== "undefined")
{
    define('hateoas-client-js', [], function () {
        return {
            "HttpAgent": HttpAgent
        };
    });
}
else if (typeof exports !== "undefined")
{
	exports.HttpAgent = HttpAgent;
}