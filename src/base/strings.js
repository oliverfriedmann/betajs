Scoped.define("module:Strings", ["module:Objs"], function (Objs) {
	/** String Utilities
	 * @module BetaJS.Strings
	 */
	return {
		
		padLeft: function (s, padding, length) {
			while (s.length < length)
				s = padding + s;
			return s;
		},
		
		/** Converts a string new lines to html <br /> tags
		 *
		 * @param s string
		 * @return string with new lines replaced by <br />
		 */
		nl2br : function(s) {
			return (s + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
		},
	
		/** Converts special characters in a string to html entitiy symbols
		 *
		 * @param s string
		 * @return converted string
		 */
		htmlentities : function(s) {
			return (s + "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
		},
	
		JS_ESCAPES : {
			"'" : "'",
			'\\' : '\\',
			'\r' : 'r',
			'\n' : 'n',
			'\t' : 't',
			'\u2028' : 'u2028',
			'\u2029' : 'u2029'
		},
	
		JS_ESCAPER_REGEX : function() {
			if (!this.JS_ESCAPER_REGEX_CACHED)
				this.JS_ESCAPER_REGEX_CACHED = new RegExp(Objs.keys(this.JS_ESCAPES).join("|"), 'g');
			return this.JS_ESCAPER_REGEX_CACHED;
		},
	
		/** Converts string such that it can be used in javascript by escaping special symbols
		 *
		 * @param s string
		 * @return escaped string
		 */
		js_escape : function(s) {
			var self = this;
			return s.replace(this.JS_ESCAPER_REGEX(), function(match) {
				return '\\' + self.JS_ESCAPES[match];
			});
		},
	
		/** Determines whether a string starts with a sub string
		 *
		 * @param s string in question
		 * @param needle sub string
		 * @return true if string in question starts with sub string
		 */
		starts_with : function(s, needle) {
			return s.substring(0, needle.length) == needle;
		},
	
		/** Determines whether a string ends with a sub string
		 *
		 * @param s string in question
		 * @param needle sub string
		 * @return true if string in question ends with sub string
		 */
		ends_with : function(s, needle) {
			return s.indexOf(needle, s.length - needle.length) !== -1;
		},
	
		/** Removes sub string from a string if string starts with sub string
		 *
		 * @param s string in question
		 * @param needle sub string
		 * @return string without sub string if it starts with sub string otherwise it returns the original string
		 */
		strip_start : function(s, needle) {
			return this.starts_with(s, needle) ? s.substring(needle.length) : s;
		},
		
		/** Returns the complete remaining part of a string after a the last occurrence of a sub string
		 *
		 * @param s string in question
		 * @param needle sub string
		 * @return remaining part of the string in question after the last occurrence of the sub string
		 */
		last_after : function(s, needle) {
			return this.splitLast(s, needle).tail;
		},
		
		first_after: function (s, needle) {
			return s.substring(s.indexOf(needle) + 1, s.length);
		},
	
		EMAIL_ADDRESS_REGEX : /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
	
		/** Determines whether a string is a syntactically valid email address
		 *
		 * @param s string in question
		 * @return true if string looks like an email address
		 */
		is_email_address : function(s) {
			return this.EMAIL_ADDRESS_REGEX.test(s);
		},
	
		STRIP_HTML_TAGS : ["script", "style", "head"],
		STRIP_HTML_REGEX : /<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi,
		STRIP_HTML_COMMENT_REGEX : /<![^>]*>/gi,
	
		/** Removes all html from data and returns plain text
		 *
		 * @param html string containing html
		 * @return string containing the plain text part of it
		 */
		strip_html : function(html) {
			var result = html;
			for (var i = 0; i < this.STRIP_HTML_TAGS.length; ++i)
				result = result.replace(new RegExp("<" + this.STRIP_HTML_TAGS[i] + ".*</" + this.STRIP_HTML_TAGS[i] + ">", "i"), '');
			result = result.replace(this.STRIP_HTML_REGEX, '').replace(this.STRIP_HTML_COMMENT_REGEX, '');
			return result;
		},
		
		splitFirst: function (s, delimiter) {
			var i = s.indexOf(delimiter);
			return {
				head: i >= 0 ? s.substring(0, i) : s,
				tail: i >= 0 ? s.substring(i + delimiter.length) : ""
			};
		},
		
		splitLast: function (s, delimiter) {
			var i = s.lastIndexOf(delimiter);
			return {
				head: i >= 0 ? s.substring(0, i) : "",
				tail: i >= 0 ? s.substring(i + delimiter.length) : s
			};
		},
		
		replaceAll: function (s, sub, wth) {
			while (s.indexOf(sub) >= 0)
				s = s.replace(sub, wth);
			return s;
		},
	
		/** Trims all trailing and leading whitespace and removes block indentations
		 *
		 * @param s string
		 * @return string with trimmed whitespaces and removed block indentation
		 */
		nltrim : function(s) {
			var a = s.replace(/\t/g, "  ").split("\n");
			var len = null;
			var i = 0;
			for ( i = 0; i < a.length; ++i) {
				var j = 0;
				while (j < a[i].length) {
					if (a[i].charAt(j) != ' ')
						break;
					++j;
				}
				if (j < a[i].length)
					len = len === null ? j : Math.min(j, len);
			}
			for ( i = 0; i < a.length; ++i)
				a[i] = a[i].substring(len);
			return this.trim(a.join("\n"));
		},
	
		capitalize : function(input) {
			return input.replace(/\w\S*/g, function(txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
		},
	
		email_get_name : function(input) {
		    input = input || "";
			var temp = input.split("<");
			input = this.trim(temp[0]);
			if (!input && temp.length > 1) {
				temp = temp[1].split(">");
				input = this.trim(temp[0]);
			}		
			input = input.replace(/['"]/g, "").replace(/[\\._@]/g, " ");
			return this.capitalize(input);
		},
	
		email_get_email : function(input) {
	        input = input || "";
			var temp = input.split("<");
			input = this.trim(temp[0]);
			if (temp.length > 1) {
				temp = temp[1].split(">");
				input = this.trim(temp[0]);
			}
			input = this.trim(input.replace(/'/g, "").replace(/"/g, ""));
			return input;
		},
	
		email_get_salutatory_name : function(input) {
	        input = input || "";
			return (this.email_get_name(input).split(" "))[0];
		},
		
		trim: function (s) {
			return String.prototype.trim ? s.trim() : s.replace(/^\s+|\s+$/g, ''); 
		},
		
		regexReplaceGroups: function (regex, args) {
			var findGroup = /\(.*?\)/;
			var f = function (captured) {
				if (arg)
					return arg;
				return captured.substring(1, captured.length - 1);
			};
			while (args.length > 0) {
				var arg = args.shift();
				regex = regex.replace(findGroup, f);
			}
			return regex;
		},
		
		namedCaptureRegex: function (regex) {
			var groupMap = {};
			var groupIdx = 0;
			var newRegex = new RegExp(regex.replace(/\([^)]+\)/ig, function (group) {
				if (group.charAt(1) != "?" && group.indexOf(":") > 0) {
					var delimiter = group.indexOf(":");
					groupMap[group.substring(1, delimiter)] = groupIdx;
					group = "(" + group.substring(delimiter + 1, group.length - 1) + ")";
				}
				groupIdx++;
				return group;
			}));
			var map = function (groups) {
				return Objs.map(groupMap, function (idx) {
					return groups[idx + 1];
				});
			};
			var exec = function (test) {
				var result = newRegex.exec(test);
				return result ? map(result) : null;
			};
			var mapBack = function (args) {
				var result = [];
				for (var i = 0; i < groupIdx; ++i)
					result.push(null);
				for (var key in args)
					if (key in groupMap)
						result[groupMap[key]] = args[key]; 
				return result;
			};
			return {
				regex: newRegex,
				map: map,
				exec: exec,
				mapBack: mapBack
			};
		}
		
	};

});
