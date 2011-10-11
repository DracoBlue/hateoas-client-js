/*
 * rest-client.js 1.0-dev
 *
 * Not yet released.
 *
 * This file is part of JsBehaviour.
 * Copyright (c) 2011 DracoBlue, http://dracoblue.net/
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

EntryPointResponse = function(xhr, value) {
    this.xhr = xhr;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
};

EntryPointResponse.prototype.getValue = function() {
    if (!this.value) {
        this.value = jQuery.parseJSON(this.xhr.responseText);
    }
    
    return this.value;
};

EntryPointResponse.prototype.at = function(pos) {
    var values = this.getValues();
    return values[pos];
};

EntryPointResponse.prototype.getValues = function() {
    if (this.values) {
        return this.values;
    }
    
    var value_entry_points = [];
    
    var values = this.getValue();
    var values_length = values.length;
    
    for (var i = 0; i < values_length; i++) {
        value_entry_points.push(new EntryPointResponse(this.xhr, values[i]));
    }
    this.values = value_entry_points;
    return this.values;
};

EntryPointResponse.prototype.getMatchingValue = function(filter_object) {
    var value_entry_points = [];
    
    var values = this.getValue();
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
            return new EntryPointResponse(this.xhr, value);
        }
    }
    
    throw new Error('No matching value found for filter object');
};

EntryPointResponse.prototype.getLink = function(link_name) {
    var links = this.getLinks();
    if (typeof links[link_name] === 'undefined') {
        throw new Error('Cannot find link with name: ' + link_name);
    }
    return links[link_name];
};

EntryPointResponse.prototype.getLinks = function() {
    if (this.links_map) {
        return this.links_map;
    }
    
    var value = this.getValue();
    var links = [];

    if (value.hasOwnProperty('links')) {
        links = $.extend(true, links, value['links']);
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
        links_map[link.rel] = new EntryPoint(link.href, headers);
    }
    
    this.links_map = links_map;
    return this.links_map;
};

EntryPoint = function(url, headers) {
    this.url = url;
    this.default_headers = headers || {};
    this.navigation_steps = [];
};

EntryPoint.prototype.clone = function() {
    var clone = new EntryPoint(this.url);
    clone.default_headers = jQuery.extend(true, {}, this.default_headers);
    clone.navigation_steps = jQuery.extend(true, [], this.navigation_steps);
    return clone;
};

EntryPoint.prototype.rawCall = function(cb, verb, params, headers) {
    var that = this;
    
    headers = headers || {};
    jQuery.ajax({
        beforeSend: function(xhrObj){
            for (var header in that.default_headers)
                xhrObj.setRequestHeader(header, that.default_headers[header]);
            for (var header in headers)
                xhrObj.setRequestHeader(header, headers[header]);
            return xhrObj;
        },        
        url: that.url,
        dataType: 'text',
        type: verb,
        data: params || {},
        complete: function(response) {
            cb(new EntryPointResponse(response));
        }
    });
};

EntryPoint.prototype.rawNavigate = function(cb) {
    var that = this;
    
    if (this.navigation_steps.length === 0) {
        cb();
        return ;
    }
    
    var step_position = 0;
    
    var performNextStep = function() {
        that.rawCall(function(current_response) {
            var next_step = that.navigation_steps[step_position];
            
            if (typeof next_step !== 'string') {
                step_position += 1;
                current_response = current_response.getMatchingValue(next_step);
            }
            
            var next_step_entry_point = current_response.getLink(that.navigation_steps[step_position]);
            that.url = next_step_entry_point.url;
            
            step_position++;
            if (step_position === that.navigation_steps.length) {
                that.navigation_steps = [];
                cb();
            } else {
                performNextStep();
            }
        }, 'GET');
    };
    
    performNextStep();
};

EntryPoint.prototype.call = function(cb, verb, params, headers) {
    var that = this;
    if (this.navigation_steps.length === 0) {
        this.rawCall(cb, verb, params, headers);
    } else {
        this.rawNavigate(function() {
            that.rawCall(cb, verb, params, headers);
        });
    }
};

EntryPoint.prototype.get = function(cb, params, headers) {
    this.call(cb, 'GET', params, headers || {});
};

EntryPoint.prototype.post = function(cb, params, headers) {
    this.call(cb, 'POST', params, headers || {});
};

EntryPoint.prototype['delete'] = function(cb, params, headers) {
    this.call(cb, 'DELETE', params, headers || {});
};

EntryPoint.prototype.put = function(cb, params, headers) {
    this.call(cb, 'PUT', params, headers || {});
};

EntryPoint.prototype.patch = function(cb, params, headers) {
    this.call(cb, 'PATCH', params, headers || {});
};

EntryPoint.prototype.navigate = function(steps) {
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

EntryPoint.prototype.addNavigationStep = function(step) {
    this.navigation_steps.push(step);
};
