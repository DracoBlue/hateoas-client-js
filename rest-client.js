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

HttpResponse = function(xhr, value) {
    this.xhr = xhr;
    this.value = value || null;
    this.values = null;
    this.links_map = null;
};

HttpResponse.prototype.getValue = function() {
    if (!this.value) {
        this.value = jQuery.parseJSON(this.xhr.responseText);
    }
    
    return this.value;
};

HttpResponse.prototype.isOk = function() {
    return this.xhr.status === 200 ? true : false;
};

HttpResponse.prototype.at = function(pos) {
    var values = this.getValues();
    return values[pos];
};

HttpResponse.prototype.getHeader = function(name, default_value) {
    return this.xhr.getResponseHeader(name) || default_value;
};

HttpResponse.prototype.getValues = function() {
    if (this.values) {
        return this.values;
    }
    
    var value_entry_points = [];
    
    var values = this.getValue();
    var values_length = values.length;
    
    for (var i = 0; i < values_length; i++) {
        value_entry_points.push(new HttpResponse(this.xhr, values[i]));
    }
    this.values = value_entry_points;
    return this.values;
};

HttpResponse.prototype.getMatchingValue = function(filter_object) {
    var value_entry_points = [];
    
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
            return new HttpResponse(this.xhr, value);
        }
    }
    
    throw new Error('No matching value found for filter object');
};

HttpResponse.prototype.getLink = function(link_name) {
    var links = this.getLinks();
    if (typeof links[link_name] === 'undefined') {
        throw new Error('Cannot find link with name: ' + link_name);
    }
    return links[link_name][0];
};

HttpResponse.prototype.getLinks = function() {
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
        links_map[link.rel] = links_map[link.rel] || [];
        links_map[link.rel].push(new HttpAgent(link.href, headers));
    }
    
    this.links_map = links_map;
    return this.links_map;
};

NotOkHttpResponse = function() {
    
};

NotOkHttpResponse.prototype.isOk = function() {
    return false;
};

HttpAgent = function(url, headers) {
    this.url = url;
    this.default_headers = headers || {};
    this.navigation_steps = [];
};

HttpAgent.prototype.clone = function() {
    var clone = new HttpAgent(this.url);
    clone.default_headers = jQuery.extend(true, {}, this.default_headers);
    clone.navigation_steps = jQuery.extend(true, [], this.navigation_steps);
    return clone;
};

HttpAgent.prototype.rawCall = function(cb, verb, params, headers) {
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
            if (response.status === 201) {
                var http_response = new HttpResponse(response);
                that.url = http_response.getHeader('Location');
                that.rawCall(cb, 'GET', {}, headers);
            } else {
                cb(new HttpResponse(response));
            }
        }
    });
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
                        cb(new NotOkHttpResponse())
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
                    cb(new NotOkHttpResponse())
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
