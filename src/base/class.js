Scoped.define("module:Class", ["module:Types", "module:Objs", "module:Functions", "module:Ids"], function (Types, Objs, Functions, Ids) {
	var Class = function () {};

	/** @suppress {checkTypes} */
	Class.extend = function (options, objects, statics, class_statics) {
		objects = objects || [];
		if (!Types.is_array(objects))
			objects = [objects];
		statics = statics || [];
		if (!Types.is_array(statics))
			statics = [statics];
		class_statics = class_statics || [];
		if (!Types.is_array(class_statics))
			class_statics = [class_statics];
		
		var parent = this;
		
		objects = Objs.map(objects, function (obj) {
			if (Types.is_function(obj))
				obj = obj(parent.prototype);
			return obj;
		});
		
		var result;
		
		// Setup JavaScript Constructor
		Objs.iter(objects, function (obj) {
			if (obj.hasOwnProperty("constructor"))
				result = obj.constructor;
		});
		var has_constructor = Types.is_defined(result);
		if (!has_constructor)
			result = function () { parent.prototype.constructor.apply(this, arguments); };
	
		// Add Parent Statics
		Objs.extend(result, parent);
	
		// Add External Statics
		Objs.iter(statics, function (stat) {
			stat = Types.is_function(stat) ? stat(parent) : stat;
			var extender = result._extender;
			Objs.extend(result, stat);
			if (stat._extender)
				result._extender = Objs.extend(Objs.clone(extender, 1), stat._extender);
		});
		
		
		// Add Class Statics
		var class_statics_keys = {};
		if (parent.__class_statics_keys) {
			for (var key in parent.__class_statics_keys) 
				result[key] = Objs.clone(parent[key], 1);
		}
		Objs.iter(class_statics, function (stat) {
			Objs.extend(result, stat);
			Objs.extend(class_statics_keys, Objs.keys(stat, true));
		});
		if (parent.__class_statics_keys)
			Objs.extend(class_statics_keys, parent.__class_statics_keys);
		result.__class_statics_keys = class_statics_keys;
		
		// Parent & Children Hierarchy
		result.parent = parent;
		result.children = [];
		result.extend = this.extend;
		if (!parent.children)
			parent.children = [];
		parent.children.push(result);
		
		// Setup Prototype
		var ctor = function () {};
		ctor.prototype = parent.prototype;
		result.prototype = new ctor();
	
		result.prototype.cls = result;
	
		
		options = Objs.extend({
		}, Types.is_string(options) ? {
			classname: options,
			register: true
		} : options);
		
		var classname = options.classname;
		if (options.scoped)
			classname = options.scoped.ns.path;
		
		result.classname = classname;
		if (classname && options.register)
			Scoped.setGlobal(classname, result);
		
		// Setup Prototype
		result.__notifications = {};
		result.__implements = {};
		
		if (parent.__notifications)
			Objs.extend(result.__notifications, parent.__notifications, 1);		
		if (parent.__implements)
			Objs.extend(result.__implements, parent.__implements, 1);		
	
		Objs.iter(objects, function (object) {
			for (var objkey in object)
				result.prototype[objkey] = result._extender && objkey in result._extender ? result._extender[objkey](result.prototype[objkey], object[objkey]) : object[objkey]; 
			//Objs.extend(result.prototype, object);
	
			// Note: Required for Internet Explorer
			if ("constructor" in object)
				result.prototype.constructor = object.constructor;
	
			if (object._notifications) {
				for (var key in object._notifications) {
					if (!result.__notifications[key])
						result.__notifications[key] = [];
					result.__notifications[key].push(object._notifications[key]);
				}
			}
			if (object._implements) {
				Objs.iter(Types.is_string(object._implements) ? [object._implements] : object._implements, function (impl) {
					result.__implements[impl] = true;
				});
			}
		});	
		delete result.prototype._notifications;
		delete result.prototype._implements;
	
		if (!has_constructor)
			result.prototype.constructor = parent.prototype.constructor;
			
		return result; 
	};
	
	
	/*
	 * 
	 * Extending the Class
	 * 
	 */
	
	Objs.extend(Class, {
		
		classname: "Class",
		
		__class_guid: "0f5499f9-f0d1-4c6c-a561-ef026a1eee05",	
		
		__notifications: {},
		
		ancestor_of: function (cls) {
			return (this == cls) || (this != Class && this.parent.ancestor_of(cls));
		},
		
		is_class: function (cls) {
			return cls && Types.is_object(cls) && ("__class_guid" in cls) && cls.__class_guid == this.__class_guid;
		},
		
		is_class_instance: function (obj) {
			return obj && Types.is_object(obj) && ("__class_instance_guid" in obj) && obj.__class_instance_guid == this.prototype.__class_instance_guid;
		},
		
		is_pure_json: function (obj) {
			return obj && Types.is_object(obj) && !this.is_class_instance(obj) && Types.is_pure_object(obj);
		},
		
		is_instance_of: function (obj) {
			return obj && this.is_class_instance(obj) && obj.instance_of(this);
		},
		
		define: function (parent, current) {
			var args = Functions.getArguments(arguments, 2);
			if (Types.is_object(parent)) {
				return Scoped.define(current, [], function (scoped) {
					args.unshift({scoped: scoped});
					return parent.extend.apply(parent, args);
				});
			} else {
				return Scoped.define(current, [parent], function (parent, scoped) {
					args.unshift({scoped: scoped});
					return parent.extend.apply(parent, args);
				});
			}
		},
		
		// Legacy Methods
	
		_inherited: function (cls, func) {
			return cls.parent[func].apply(this, Array.prototype.slice.apply(arguments, [2]));
		}	
		
	});
	
	
	
	
	
	
	/*
	 * 
	 * Extending the Object
	 * 
	 */
	
	Class.prototype.__class_instance_guid = "e6b0ed30-80ee-4b28-af02-7d52430ba45f";
	
	//Class.prototype.supportsGc = false;
	
	Class.prototype.constructor = function () {
		this._notify("construct");
	};
	
	Class.prototype.destroy = function () {
		this._notify("destroy");
		if (this.__auto_destroy_list) {
			for (var i = 0; i < this.__auto_destroy_list.length; ++i) {
				if ("destroy" in this.__auto_destroy_list[i])
					this.__auto_destroy_list[i].weakDestroy();
			}
		}
		var cid = this.cid();
		for (var key in this)
			delete this[key];
		Ids.objectId(this, cid);
		this.destroy = this.__destroyedDestroy;
	};
	
	Class.prototype.destroyed = function () {
		return this.destroy === this.__destroyedDestroy;
	};
	
	Class.prototype.weakDestroy = function () {
		if (!this.destroyed()) {
			if (this.__gc) {
				this.__gc.queue(this);
				return;
			}
			this.destroy();
		}
	};

	Class.prototype.__destroyedDestroy = function () {
		throw ("Trying to destroy destroyed object " + this.cid() + ": " + this.cls.classname + ".");
	};
	
	Class.prototype.enableGc = function (gc) {
		if (this.supportsGc)
			this.__gc = gc; 
	};
	
	Class.prototype.dependDestroy = function (other) {
		if (other.destroyed)
			return;
		if (this.__gc)
			other.enableGc();
		other.weakDestroy();
	};
	
	Class.prototype.cid = function () {
		return Ids.objectId(this);
	};

	Class.prototype.cls = Class;
	
	Class.prototype.as_method = function (s) {
		return Functions.as_method(this[s], this);
	};
	
	Class.prototype.auto_destroy = function (obj) {
		if (obj) {
			if (!this.__auto_destroy_list)
				this.__auto_destroy_list = [];
			var target = obj;
			if (!Types.is_array(target))
			   target = [target];
			for (var i = 0; i < target.length; ++i)
			   this.__auto_destroy_list.push(target[i]);
		}
		return obj;
	};
	
	Class.prototype._notify = function (name) {
		if (!this.cls.__notifications)
			return;
		var rest = Array.prototype.slice.call(arguments, 1);
		Objs.iter(this.cls.__notifications[name], function (entry) {
			var method = Types.is_function(entry) ? entry : this[entry];
			if (!method)
				throw this.cls.classname  + ": Could not find " + name + " notification handler " + entry;
			method.apply(this, rest);
		}, this);
	};
	
	Class.prototype.impl = function (identifier) {
		return !!(this.cls.__implements && this.cls.__implements[Types.is_string(identifier) ? identifier : identifier._implements]);
	};
	
	Class.prototype.instance_of = function (cls) {
		return this.cls.ancestor_of(cls);
	};
	
	Class.prototype.increaseRef = function () {
		this.__referenceCount = this.__referenceCount || 0;
		this.__referenceCount++;
	};
	
	Class.prototype.decreaseRef = function () {
		this.__referenceCount = this.__referenceCount || 0;
		this.__referenceCount--;
		if (this.__referenceCount <= 0)
			this.weakDestroy();
	};	
	
	Class.prototype.inspect = function () {
		return {
			header: {
				cid: this.cid(),
				classname: this.cls.classname,
				destroyed: this.destroyed()
			},
			attributes: {
				attributes_public: Objs.filter(this, function (value, key) {
					return !Types.is_function(value) && key.indexOf("_") !== 0;
				}, this),
				attributes_protected: Objs.filter(this, function (value, key) {
					return !Types.is_function(value) && key.indexOf("_") === 0 && key.indexOf("__") !== 0;
				}, this),
				attributes_private: Objs.filter(this, function (value, key) {
					return !Types.is_function(value) && key.indexOf("__") === 0;
				}, this)
			},
			methods: {
				methods_public: Objs.filter(this, function (value, key) {
					return Types.is_function(value) && key.indexOf("_") !== 0;
				}, this),
				methods_protected: Objs.filter(this, function (value, key) {
					return Types.is_function(value) && key.indexOf("_") === 0 && key.indexOf("__") !== 0;
				}, this),
				method_private: Objs.filter(this, function (value, key) {
					return Types.is_function(value) && key.indexOf("__") === 0;
				}, this)
			}
		};
	};

	
	// Legacy Methods
	
	Class.prototype._auto_destroy = function(obj) {
		return this.auto_destroy(obj);
	};
	
	Class.prototype._inherited = function (cls, func) {
		return cls.parent.prototype[func].apply(this, Array.prototype.slice.apply(arguments, [2]));
	};
	
	return Class;

});
	