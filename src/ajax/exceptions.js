Scoped.define("module:Ajax.AjaxException", [
    "module:Exceptions.Exception"
], function (Exception, scoped) {
	return Exception.extend({scoped: scoped});
});


Scoped.define("module:Ajax.NoCandidateAjaxException", [
	"module:Ajax.AjaxException"
], function (Exception, scoped) {
	return Exception.extend({scoped: scoped});
});


Scoped.define("module:Ajax.ReturnDataParseException", [
	"module:Ajax.AjaxException"
], function (Exception, scoped) {
   	return Exception.extend({scoped: scoped}, function (inherited) {
   		return {
   			
   			constructor: function (data, decodeType) {
   				inherited.constructor.call(this, "Could not decode data with type " + decodeType);
   				this.__decodeType = decodeType;
   				this.__data = data;
   			}
   			
   		};
   	});
});


Scoped.define("module:Ajax.RequestException", [
	"module:Ajax.AjaxException"
], function (Exception, scoped) {
   	return Exception.extend({scoped: scoped}, function (inherited) {
		   		
		/**
		 * Request Exception Class
		 * 
		 * @class BetaJS.Ajax.RequestException
		 */
		return {
		
			/**
			 * Instantiates a Ajax Request Exception
			 * 
			 * @param status_code Status Code
			 * @param {string} status_text Status Text
			 * @param data Custom Exception Data
			 */
			constructor: function (status_code, status_text, data) {
				inherited.constructor.call(this, status_code + ": " + status_text);
				this.__status_code = status_code;
				this.__status_text = status_text;
				this.__data = data;
			},
		
			/**
			 * Returns the status code associated with the exception
			 * 
			 * @return status code
			 */
			status_code: function () {
				return this.__status_code;
			},
		
			/**
			 * Returns the status text associated with the exception
			 * 
			 * @return {string} status text
			 */
			status_text: function () {
				return this.__status_text;
			},
		
			/**
			 * Returns the custom data associated with the exception 
			 * 
			 * @return custom data
			 */
			data: function () {
				return this.__data;
			},
		
			/**
			 * Returns a JSON representation of the exception
			 * 
			 * @return {object} Exception JSON representation
			 */
			json: function () {
				return Objs.extend({
					data: this.data(),
					status_code: this.status_code(),
					status_text: this.status_text()
				}, inherited.json.call(this));
			}
			
		};
   	});
});
