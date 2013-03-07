/*! FileAPI v1.2.4 | 2013-03-07 | git://github.com/mailru/FileAPI.git
 * FileAPI — a set of  javascript tools for working with files. Multiupload, drag'n'drop and chunked file upload. Images: crop, resize and auto orientation by EXIF.
 */

/*
 * JavaScript Canvas to Blob 2.0.3
 * https://github.com/blueimp/JavaScript-Canvas-to-Blob
 *
 * Copyright 2012, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *
 * Based on stackoverflow user Stoive's code snippet:
 * http://stackoverflow.com/q/4998908
 */

/*jslint nomen: true, regexp: true */
/*global window, atob, Blob, ArrayBuffer, Uint8Array, define */

(function (window) {
    'use strict';
    var CanvasPrototype = window.HTMLCanvasElement &&
            window.HTMLCanvasElement.prototype,
        hasBlobConstructor = window.Blob && (function () {
            try {
                return Boolean(new Blob());
            } catch (e) {
                return false;
            }
        }()),
        hasArrayBufferViewSupport = hasBlobConstructor && window.Uint8Array &&
            (function () {
                try {
                    return new Blob([new Uint8Array(100)]).size === 100;
                } catch (e) {
                    return false;
                }
            }()),
        BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
            window.MozBlobBuilder || window.MSBlobBuilder,
        dataURLtoBlob = (hasBlobConstructor || BlobBuilder) && window.atob &&
            window.ArrayBuffer && window.Uint8Array && function (dataURI) {
                var byteString,
                    arrayBuffer,
                    intArray,
                    i,
                    mimeString,
                    bb;
                if (dataURI.split(',')[0].indexOf('base64') >= 0) {
                    // Convert base64 to raw binary data held in a string:
                    byteString = atob(dataURI.split(',')[1]);
                } else {
                    // Convert base64/URLEncoded data component to raw binary data:
                    byteString = decodeURIComponent(dataURI.split(',')[1]);
                }
                // Write the bytes of the string to an ArrayBuffer:
                arrayBuffer = new ArrayBuffer(byteString.length);
                intArray = new Uint8Array(arrayBuffer);
                for (i = 0; i < byteString.length; i += 1) {
                    intArray[i] = byteString.charCodeAt(i);
                }
                // Separate out the mime component:
                mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                // Write the ArrayBuffer (or ArrayBufferView) to a blob:
                if (hasBlobConstructor) {
                    return new Blob(
                        [hasArrayBufferViewSupport ? intArray : arrayBuffer],
                        {type: mimeString}
                    );
                }
                bb = new BlobBuilder();
                bb.append(arrayBuffer);
                return bb.getBlob(mimeString);
            };
    if (window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
        if (CanvasPrototype.mozGetAsFile) {
            CanvasPrototype.toBlob = function (callback, type) {
                callback(this.mozGetAsFile('blob', type));
            };
        } else if (CanvasPrototype.toDataURL && dataURLtoBlob) {
            CanvasPrototype.toBlob = function (callback, type) {
                callback(dataURLtoBlob(this.toDataURL(type)));
            };
        }
    }
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return dataURLtoBlob;
        });
    } else {
        window.dataURLtoBlob = dataURLtoBlob;
    }
}(window));
;/*jslint evil: true */
/*global window, Image, Blob, XMLHttpRequest, URL, webkitURL, ActiveXObject */

(function (window, undef){
	'use strict';

	var
		gid = 1,
		noop = function (){},
		userAgent = window.navigator.userAgent,

		// https://github.com/blueimp/JavaScript-Load-Image/blob/master/load-image.js#L48
		apiURL = (window.createObjectURL && window) || (window.URL && URL.revokeObjectURL && URL) || (window.webkitURL && webkitURL),

		File = window.File,
		FileReader = window.FileReader,
		FormData = window.FormData,
		jQuery = window.jQuery,

		html5 =    !!(File && (FileReader && window.Uint8Array || FormData))
				&& !(/safari\//.test(userAgent) && /windows/i.test(userAgent)), // BugFix: https://github.com/mailru/FileAPI/issues/25

		cors = html5 && ('withCredentials' in (new XMLHttpRequest)),
		
		chunked = html5 && !!Blob && !!(Blob.prototype.webkitSlice || Blob.prototype.mozSlice || Blob.prototype.slice),

		document = window.document,

		// https://github.com/blueimp/JavaScript-Canvas-to-Blob
		dataURLtoBlob = window.dataURLtoBlob,

		_rimg = /img/i,
		_rcanvas = /canvas/i,
		_rimgcanvas = /img|canvas/,
		_rinput = /input/i,
		_rdata = /^data:[^,]+,/,

		Num = Number,
		Math = Math,

		_pow = Math.pow,
		_round = Math.round,
		_from = function (sz) { return _round(sz * this); },

		_KB = new Num(1024),
		_MB = new Num(_pow(_KB, 2)),
		_GB = new Num(_pow(_KB, 3)),
		_TB = new Num(_pow(_KB, 4)),

		_elEvents = {}, // element event listeners
		_infoReader = [], // list of file info processors

		_readerEvents = 'abort progress error load loadend',
		_xhrPropsExport = 'status statusText readyState response responseXML responseText responseBody'.split(' '),

		currentTarget = 'currentTarget', // for minimize
		preventDefault = 'preventDefault', // and this too

		_isArray = function (ar) {
			return	(typeof ar == 'object') && ar && ('length' in ar);
		},

		/**
		 * Iterate over a object or array
		 */
		_each = function (obj, fn, ctx){
			if( obj ){
				if( _isArray(obj) ){
					for( var i = 0, n = obj.length; i < n; i++ ){
						if( i in obj ){
							fn.call(ctx, obj[i], i, obj);
						}
					}
				}
				else {
					for( var key in obj ){
						if( obj.hasOwnProperty(key) ){
							fn.call(ctx, obj[key], key, obj);
						}
					}
				}
			}
		},


		/**
		 * Add event listener
		 */
		_on = function (el, type, fn){
			if( el ){
				var uid = api.uid(el);

				if( !_elEvents[uid] ){
					_elEvents[uid] = {};
				}

				_each(type.split(/\s+/), function (type){
					if( jQuery ){
						jQuery.event.add(el, type, fn);
					}
					else {
						if( !_elEvents[uid][type] ){
							_elEvents[uid][type] = [];
						}

						_elEvents[uid][type].push(fn);

						if( el.addEventListener ){ el.addEventListener(type, fn, false); }
						else if( el.attachEvent ){ el.attachEvent('on'+type, fn); }
						else { el['on'+type] = fn; }
					}
				});
			}
		},


		/**
		 * Remove event listener
		 */
		_off = function (el, type, fn){
			if( el ){
				var uid = api.uid(el), events = _elEvents[uid] || {};

				_each(type.split(/\s+/), function (type){
					if( jQuery ){
						jQuery.event.remove(el, type, fn);
					}
					else {
						var fns = events[type] || [], i = fns.length;

						while( i-- ){
							if( fns[i] === fn ){
								fns.splice(i, 1);
								break;
							}
						}

						if( el.addEventListener ){ el.removeEventListener(type, fn, false); }
						else if( el.detachEvent ){ el.detachEvent('on'+type, fn); }
						else { el['on'+type] = null; }
					}
				});
			}
		},


		_one = function(el, type, fn){
			_on(el, type, function _(evt){
				_off(el, type, _);
				fn(evt);
			});
		},


		_fixEvent = function (evt){
			if( !evt.target ){ evt.target = window.event && window.event.srcElement || document; }
			if( evt.target.nodeType === 3 ){ evt.target = evt.target.parentNode; }
			return  evt;
		},



		/**
		 * FileAPI (core object)
		 */
		api = {
			version: '1.2.4',

			cors: false,
			debug: false,
			pingUrl: false,

			staticPath: './',

			flashUrl: 0, // @default: './FileAPI.flash.swf'
			flashImageUrl: 0, // @default: './FileAPI.flash.image.swf'

			// Fallback for flash
			accept: {
				  'image/*': 'art bm bmp dwg dxf cbr cbz fif fpx gif ico iefs jfif jpe jpeg jpg jps jut mcf nap nif pbm pcx pgm pict pm png pnm qif qtif ras rast rf rp svf tga tif tiff xbm xbm xpm xwd'
				, 'audio/*': 'm4a flac aac rm mpa wav wma ogg mp3 mp2 m3u mod amf dmf dsm far gdm imf it m15 med okt s3m stm sfx ult uni xm sid ac3 dts cue aif aiff wpl ape mac mpc mpp shn wv nsf spc gym adplug adx dsp adp ymf ast afc hps xs'
				, 'video/*': 'm4v 3gp nsv ts ty strm rm rmvb m3u ifo mov qt divx xvid bivx vob nrg img iso pva wmv asf asx ogm m2v avi bin dat dvr-ms mpg mpeg mp4 mkv avc vp3 svq3 nuv viv dv fli flv wpl'
			},

			chunkSize : 0,
			chunkUploadRetry : 0,
			chunkNetworkDownRetryTimeout : 2000, // milliseconds, don't flood when network is down

			KB: (_KB.from = _from, _KB),
			MB: (_MB.from = _from, _MB),
			GB: (_GB.from = _from, _GB),
			TB: (_TB.from = _from, _TB),

			expando: 'fileapi' + (new Date).getTime(),

			uid: function (obj){
				return	obj
					? (obj[api.expando] = obj[api.expando] || api.uid())
					: (++gid, api.expando + gid)
				;
			},

			log: function (){
				if( api.debug && window.console && console.log ){
					if( console.log.apply ){
						console.log.apply(console, arguments);
					}
					else {
						console.log([].join.call(arguments, ' '));
					}
				}
			},

			getXHR: function (){
				var xhr;

				if( window.XMLHttpRequest ){
					xhr = new XMLHttpRequest;
				}
				else if( window.ActiveXObject ){
					try { xhr = new ActiveXObject('MSXML2.XMLHttp.3.0'); } catch (e) { }
				}

				return  xhr;
			},

			isArray: _isArray,

			support: {
				dnd:     cors && ('ondrop' in document.createElement('div')),
				cors:    cors,
				html5:   html5,
				chunked: chunked,
				dataURI: true
			},

			event: {
				  on: _on
				, off: _off
				, one: _one
				, fix: _fixEvent
			},


			throttle: function(fn, delay) {
				var id, args;

				return function _throttle(){
					args = arguments;

					if( !id ){
						fn.apply(window, args);
						id = setTimeout(function (){
							id = 0;
							fn.apply(window, args);
						}, delay);
					}
				};
			},


			F: function (){},


			parseJSON: function (str){
				var json;
				if( window.JSON && JSON.parse ){
					json = JSON.parse(str);
				}
				else {
					json = (new Function('return ('+str.replace(/([\r\n])/g, '\\$1')+');'))();
				}
				return json;
			},


			trim: function (str){
				str = String(str);
				return	str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
			},

			/**
			 * Simple Defer
			 * @return	{Object}
			 */
			defer: function (){
				var
					  list = []
					, result
					, error
					, defer = {
						resolve: function (err, res){
							defer.resolve = noop;
							error	= err || false;
							result	= res;

							while( res = list.shift() ){
								res(error, result);
							}
						},

						then: function (fn){
							if( error !== undef ){
								fn(error, result);
							} else {
								list.push(fn);
							}
						}
				};

				return	defer;
			},

			queue: function (fn){
				var
					  _idx = 0
					, _length = 0
					, _fail = false
					, _end = false
					, queue = {
						inc: function (){
							_length++;
						},

						next: function (){
							_idx++;
							setTimeout(queue.check, 0);
						},

						check: function (){
							(_idx >= _length) && !_fail && queue.end();
						},

						isFail: function (){
							return _fail;
						},

						fail: function (){
							!_fail && fn(_fail = true);
						},

						end: function (){
							if( !_end ){
								_end = true;
								fn();
							}
						}
					}
				;
				return queue;
			},


			/**
			 * For each object
			 *
			 * @param	{Object|Array}	obj
			 * @param	{Function}		fn
			 * @param	{*}				[ctx]
			 */
			each: _each,


			/**
			 * Async for
			 *
			 * @param	{Array}	array
			 */
			afor: function (array, callback){
				var i = 0, n = array.length;

				if( _isArray(array) && n-- ){
					(function _next(){
						callback(n != i && _next, array[i], i++);
					})();
				}
				else {
					callback(false);
				}
			},



			/**
			 * Merge the contents of two or more objects together into the first object
			 *
			 * @param	{Object}	dst
			 * @param	{Object}	[src]
			 * @return	{Object}
			 */
			extend: function (dst){
				_each(arguments, function (src){
					_each(src, function (val, key){
						dst[key] = val;
					});
				});
				return  dst;
			},


			/**
			 * Is file instance
			 *
			 * @param  {File}  file
			 * @return {Boolean}
			 */
			isFile: function (file){
				return	html5 && file && (file instanceof File);
			},


			/**
			 * Is canvas element
			 *
			 * @param	{HTMLElement}	el
			 * @return	{Boolean}
			 */
			isCanvas: function (el){
				return	el && _rcanvas.test(el.nodeName);
			},


			getFilesFilter: function (filter){
				filter = typeof filter == 'string' ? filter : (filter.getAttribute && filter.getAttribute('accept') || '');
				return	filter ? new RegExp('('+ filter.replace(/\./g, '\\.').replace(/,/g, '|') +')$', 'i') : /./;
			},



			/**
			 * Read as DataURL
			 *
			 * @param {File|Element} file
			 * @param {Function} fn
			 */
			readAsDataURL: function (file, fn){
				if( api.isCanvas(file) ){
					_emit(file, fn, 'load', api.toDataURL(file));
				}
				else {
					_readAs(file, fn, 'DataURL');
				}
			},


			/**
			 * Read as Binary string
			 *
			 * @param {File} file
			 * @param {Function} fn
			 */
			readAsBinaryString: function (file, fn){
				if( _hasSupportReadAs('BinaryString') ){
					_readAs(file, fn, 'BinaryString');
				} else {
					// Hello IE10!
					_readAs(file, function (evt){
						if( evt.type == 'load' ){
							try {
								// dataURL -> binaryString
								evt.result = api.toBinaryString(evt.result);
							} catch (e){
								evt.type = 'error';
								evt.message = e.toString();
							}
						}
						fn(evt);
					}, 'DataURL');
				}
			},


			/**
			 * Read as ArrayBuffer
			 *
			 * @param {File} file
			 * @param {Function} fn
			 */
			readAsArrayBuffer: function(file, fn){
				_readAs(file, fn, 'ArrayBuffer');
			},


			/**
			 * Read as text
			 *
			 * @param {File} file
			 * @param {String} encoding
			 * @param {Function} fn
			 */
			readAsText: function(file, encoding, fn){
				if( !fn ){
					fn	= encoding;
					encoding = 'utf-8';
				}

				_readAs(file, fn, 'Text', encoding);
			},


			/**
			 * Convert image or canvas to DataURL
			 *
			 * @param   {Element}   el    Image or Canvas element
			 * @return  {String}
			 */
			toDataURL: function (el){
				if( typeof el == 'string' ){
					return  el;
				}
				else if( el.toDataURL ){
					return  el.toDataURL('image/png');
				}
			},


			/**
			 * Canvert string, image or canvas to binary string
			 *
			 * @param   {String|Element} val
			 * @return  {String}
			 */
			toBinaryString: function (val){
				return  window.atob(api.toDataURL(val).replace(_rdata, ''));
			},


			/**
			 * Read file or DataURL as ImageElement
			 *
			 * @param	{File|String}	file
			 * @param	{Function}		fn
			 * @param	{Boolean}		[progress]
			 */
			readAsImage: function (file, fn, progress){
				if( api.isFile(file) ){
					if( apiURL ){
						/** @namespace apiURL.createObjectURL */
						var data = apiURL.createObjectURL(file);
						if( data === undef ){
							_emit(file, fn, 'error');
						}
						else {
							api.readAsImage(data, fn, progress);
						}
					}
					else {
						api.readAsDataURL(file, function (evt){
							if( evt.type == 'load' ){
								api.readAsImage(evt.result, fn, progress);
							}
							else if( progress || evt.type == 'error' ){
								_emit(file, fn, evt, null, { loaded: evt.loaded, total: evt.total });
							}
						});
					}
				}
				else if( api.isCanvas(file) ){
					_emit(file, fn, 'load', file);
				}
				else if( _rimg.test(file.nodeName) ){
					if( file.complete ){
						_emit(file, fn, 'load', file);
					}
					else {
						var events = 'error abort load';
						_one(file, events, function _fn(evt){
							if( evt.type == 'load' && apiURL ){
								/** @namespace apiURL.revokeObjectURL */
								apiURL.revokeObjectURL(file.src);
							}

							_off(file, events, _fn);
							_emit(file, fn, evt, file);
						});
					}
				}
				else if( file.iframe ){
					_emit(file, fn, { type: 'error' });
				}
				else {
					// Created image
					var img = new Image;
					img.src = file.dataURL || file;
					api.readAsImage(img, fn, progress);
				}
			},


			/**
			 * Make file by name
			 *
			 * @param	{String}	name
			 * @return	{Array}
			 */
			checkFileObj: function (name){
				var file = {}, accept = api.accept;

				if( typeof name == 'object' ){
					file = name;
				}
				else {
					file.name = (name + '').split(/\\|\//g).pop();
				}

				if( file.type == null ){
					file.type = file.name.split('.').pop();
				}

				_each(accept, function (ext, type){
					ext = new RegExp(ext.replace(/\s/g, '|'), 'i');
					if( ext.test(file.type) ){
						file.type = type.split('/')[0] +'/'+ file.type;
					}
				});

				return	file;
			},


			/**
			 * Get drop files
			 *
			 * @param	{Event}	evt
			 * @param	{Function} callback
			 */
			getDropFiles: function (evt, callback){
				var
					  files = []
					, dataTransfer = _getDataTransfer(evt)
					, entrySupport = _isArray(dataTransfer.items) && dataTransfer.items[0] && _getAsEntry(dataTransfer.items[0])
					, queue = api.queue(function (){ callback(files); })
				;

				_each((entrySupport ? dataTransfer.items : dataTransfer.files) || [], function (item){
					queue.inc();
					if( entrySupport ){
						_readEntryAsFiles(item, function (err, entryFiles){
							!err && files.push.apply(files, entryFiles);
							queue.next();
						});
					}
					else {
						_isRegularFile(item, function (yes){
							yes && files.push(item);
							queue.next();
						});
					}
				});

				queue.check();
			},


			/**
			 * Get file list
			 *
			 * @param	{HTMLInput|Event}	input
			 * @param	{String|Function}	[filter]
			 * @param	{Function}			[callback]
			 * @return	{Array|Null}
			 */
			getFiles: function (input, filter, callback){
				var files = [];

				if( callback ){
					api.filterFiles(api.getFiles(input), filter, callback);
					return null;
				}

				if( input.jquery ){
					// jQuery object
					input.each(function (){
						files = files.concat(api.getFiles(this));
					});
					input	= files;
					files	= [];
				}

				if( typeof filter == 'string' ){
					filter	= api.getFilesFilter(filter);
				}

				if( input.originalEvent ){
					// jQuery event
					input = _fixEvent(input.originalEvent);
				}
				else if( input.srcElement ){
					// IE Event
					input = _fixEvent(input);
				}


				if( input.dataTransfer ){
					// Drag'n'Drop
					input = input.dataTransfer;
				}
				else if( input.target ){
					// Event
					input = input.target;
				}

				if( input.files ){
					// Input[type="file"]
					files = input.files;
				}
				else if( !html5 && isInputFile(input) ){
					if( api.trim(input.value) ){
						files = [api.checkFileObj(input.value)];
						files[0].blob   = input;
						files[0].iframe = true;
					}
				}
				else if( _isArray(input) ){
					files	= input;
				}

				return	api.filter(files, function (file){ return !filter || filter.test(file.name); });
			},


			/**
			 * Get image information
			 *
			 * @param	{File}		file
			 * @param	{Function}	fn
			 */
			getInfo: function (file, fn){
				var info = {}, readers = _infoReader.concat();

				if( api.isFile(file) ){
					(function _next(){
						var reader = readers.shift();
						if( reader ){
							if( reader.test(file.type) ){
								reader(file, function (err, res){
									if( err ){
										fn(err);
									}
									else {
										api.extend(info, res);
										_next();
									}
								});
							}
							else {
								_next();
							}
						}
						else {
							fn(false, info);
						}
					})();
				}
				else {
					fn('not_support', info);
				}
			},


			/**
			 * Add information reader
			 *
			 * @param {RegExp} mime
			 * @param {Function} fn
			 */
			addInfoReader: function (mime, fn){
				fn.test = function (type){ return mime.test(type); };
				_infoReader.push(fn);
			},


			/**
			 * Filter of array
			 *
			 * @param	{Array}		input
			 * @param	{Function}	fn
			 * @return	{Array}
			 */
			filter: function (input, fn){
				var result = [], i = 0, n = input.length, val;

				for( ; i < n; i++ ){
					if( i in input ){
						val = input[i];
						if( fn.call(val, val, i, input) ){
							result.push(val);
						}
					}
				}

				return	result;
			},


			/**
			 * Filter files
			 *
			 * @param	{Array}		files
			 * @param	{Function}	eachFn
			 * @param	{Function}	resultFn
			 */
			filterFiles: function (files, eachFn, resultFn){
				if( files.length ){
					// HTML5 or Flash
					var queue = files.concat(), file, result = [], deleted = [];

					(function _next(){
						if( queue.length ){
							file = queue.shift();
							api.getInfo(file, function (err, info){
								(eachFn(file, err ? false : info) ? result : deleted).push(file);
								_next();
							});
						}
						else {
							resultFn(result, deleted);
						}
					})();
				}
				else {
					resultFn([], files);
				}
			},


			upload: function (options){
				options = api.extend({
					  prepare: api.F
					, beforeupload: api.F
					, upload: api.F
					, fileupload: api.F
					, fileprogress: api.F
					, filecomplete: api.F
					, progress: api.F
					, complete: api.F
					, pause: api.F
					, chunkSize: api.chunkSize
					, chunkUpoloadRetry: api.chunkUploadRetry
				}, options);

				if( options.imageAutoOrientation && !options.imageTransform ){
					options.imageTransform	= { rotate: 'auto' };
				}


				var
					  proxyXHR = new api.XHR(options)
					, dataArray = this._getFilesDataArray(options.files)
					, total = 0
					, loaded = 0
					, _loaded = 0
					, _part = 1 // part of total size
					, _this = this
					, _nextFile
					, _complete = false
				;


				// calc total size
				_each(dataArray, function (data){
					total += data.size;
				});

				// Array of files
				proxyXHR.files = [];
				_each(dataArray, function (data){
					proxyXHR.files.push(data.file);
				});

				// Set upload status props
				proxyXHR.total	= total;
				proxyXHR.loaded	= 0;

				// emit "beforeupload"  event
				options.beforeupload(proxyXHR, options);
				// Upload by file
				( _nextFile = function _nextFile(){
					var
						  data = dataArray.shift()
						, _file = data && data.file
						, _fileLoaded = false
						, _fileOptions = _simpleClone(options)
					;

					if( ( proxyXHR.statusText != 'abort' || proxyXHR.current ) && data ){
					    // Mark active job
					    _complete = false;

						// Set current upload file
						proxyXHR.currentFile = _file;

						// Prepare file options
						options.prepare(_file, _fileOptions);

						this._getFormData(_fileOptions, data, function (form){
							if( !loaded ){
								// emit "upload" event
								options.upload(proxyXHR, options);
							}

							var xhr = new api.XHR(api.extend({}, _fileOptions, {

								upload: function (){
									// emit "fileupload" event
									options.fileupload(_file, xhr, _fileOptions);
								},

								progress: function (evt){
									if( !_fileLoaded ){
										loaded += (total * _part * (evt.loaded/evt.total) - _loaded + 0.5)|0;
										_loaded = loaded;

										data.total	= evt.total;
										data.loaded	= evt.loaded;

										// emit "fileprogress" event
										options.fileprogress(evt, _file, xhr, _fileOptions);

										// emit "progress" event
										options.progress({
											  type:   evt.type
											, total:  total
											, loaded: proxyXHR.loaded = loaded
											, lengthComputable: true
										}, _file, xhr, _fileOptions);
									}
								},

								complete: function (err){
									_each(_xhrPropsExport, function (name){
										proxyXHR[name] = xhr[name];
									});

									// fixed throttle event
									_fileLoaded = true;

									data.loaded	= data.total;

									// bytes loaded
									proxyXHR.loaded = (loaded += (loaded - _loaded) + (total*_part + 0.5)|0);

									// emit "filecomplete" event
									options.filecomplete(err, xhr, _file, _fileOptions);

									// upload next file
									_nextFile.call(_this);
								}
							})); // xhr


							// share of file size from the total size
							_part = data.size / total;

							// ...
							proxyXHR.abort = function (current){ this.current = current; xhr.abort(); };

							// Start upload
							xhr.send(form);
						});
					}
					else {
						options.complete(proxyXHR.status == 200 || proxyXHR.status == 201 ? false : (proxyXHR.statusText || 'error'), proxyXHR, options);
						// Mark done state
						_complete = true;
					}
				}).call(this);

				// Append more files to the existing request
				proxyXHR.append = function (files) {
					files = api._getFilesDataArray(files);

					_each(files, function (data) {
						total += data.size;
						proxyXHR.files.push(data.file);
						dataArray.push(data);
					});

					if (_complete) {
						_nextFile.call(_this);
					}
				};

				// Removes file from queue by file reference and returns it
				proxyXHR.remove = function (file) {
				    var idx = -1;
					_each(dataArray, function (data) {
						idx++;
						if (data.file == file) {
							return dataArray.splice(idx, 1);
						}
					});
				};

				return proxyXHR;
			},


			_getFilesDataArray: function (data){
				var files = [], oFiles = {};

				if( isInputFile(data) ){
					var tmp = api.getFiles(data);
					oFiles[data.name || 'file'] = data.getAttribute('multiple') !== null ? tmp : tmp[0];
				}
				else if( _isArray(data) && isInputFile(data[0]) ){
					_each(data, function (input){
						oFiles[input.name || 'file'] = api.getFiles(input);
					});
				}
				else {
					oFiles = data;
				}

				_each(oFiles, function add(file, name){
					if( _isArray(file) ){
						_each(file, function (file){
							add(file, name);
						});
					}
					else if( file && file.name ){
						files.push({
							  name: name
							, file: file
							, size: file.size
							, total: file.size
							, loaded: 0
						});
					}
				});

				return	files;
			},


			_getFormData: function (options, data, fn){
				var
					  file = data.file
					, name = data.name
					, filename = file.name
					, filetype = file.type
					, trans = api.support.transform && options.imageTransform
					, Form = new api.Form
					, queue = api.queue(function (){ fn(Form); })
					, isOrignTrans = trans && (parseInt(trans.maxWidth || trans.minWidth || trans.width, 10) > 0 || trans.rotate)
				;


				if( api.Image && trans && (/image/.test(file.type) || _rimgcanvas.test(file.nodeType)) ){
					queue.inc();

					if( isOrignTrans ){
						// Convert to array for transform function
						trans = [trans];
					}

					api.Image.transform(file, trans, options.imageAutoOrientation, function (err, images){
						if( isOrignTrans && !err ){
							if( !dataURLtoBlob && !api.flashEngine ){
								images[0] = api.toBinaryString(images[0]);
								Form.multipart = true;
							}

							Form.append(name, images[0], filename, filetype);
						}
						else {
							if( !err ){
								_each(images, function (image, idx){
									if( !dataURLtoBlob && !api.flashEngine ){
										image = api.toBinaryString(image);
										Form.multipart = true;
									}

									Form.append(name +'['+ idx +']', image, filename, filetype);
								});

								name += '[original]';
							}

							if( err || options.imageOriginal ){
								Form.append(name, file, filename, filetype);
							}
						}

						queue.next();
					});
				}
				else {
					Form.append(name, file, filename);
				}

				// Append data
				_each(options.data, function add(val, name){
					if( typeof val == 'object' ){
						_each(val, function (v, i){
							add(v, name+'['+i+']');
						});
					}
					else {
						Form.append(name, val);
					}
				});

				queue.check();
			},


			reset: function (inp){
				var parent, clone;

				if( jQuery ){
					clone = jQuery(inp).clone(true).insertBefore(inp).val('')[0];
					jQuery(inp).remove();
				} else {
					parent  = inp.parentNode;
					clone   = parent.insertBefore(inp.cloneNode(true), inp);
					clone.value = '';
					parent.removeChild(inp);

					_each(_elEvents[api.uid(inp)], function (fns, type){
						_each(fns, function (fn){
							_off(inp, type, fn);
							_on(clone, type, fn);
						});
					});
				}

				return  clone;
			},


			/**
			 * Load remote file
			 *
			 * @param   {String}    url
			 * @param   {Function}  fn
			 * @return  {XMLHttpRequest}
			 */
			load: function (url, fn){
				var xhr = api.getXHR();
				if( xhr ){
					xhr.open('GET', url, true);

					if( xhr.overrideMimeType ){
				        xhr.overrideMimeType('text/plain; charset=x-user-defined');
					}

					_on(xhr, 'progress', function (/**Event*/evt){
						/** @namespace evt.lengthComputable */
						if( evt.lengthComputable ){
							fn({ type: evt.type, loaded: evt.loaded, total: evt.total }, xhr);
						}
					});

					xhr.onreadystatechange = function(){
						if( xhr.readyState == 4 ){
							xhr.onreadystatechange = null;
							if( xhr.status == 200 ){
								url = url.split('/');
								/** @namespace xhr.responseBody */
								var file = {
								      name: url[url.length-1]
									, size: xhr.getResponseHeader('Content-Length')
									, type: xhr.getResponseHeader('Content-Type')
								};
								file.dataURL = 'data:'+file.type+';base64,' + api.encode64(xhr.responseBody || xhr.responseText);
								fn({ type: 'load', result: file });
							}
							else {
								fn({ type: 'error' });
							}
					    }
					};
				    xhr.send(null);
				} else {
					fn({ type: 'error' });
				}

				return  xhr;
			},

			encode64: function (str){
				var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=', outStr = '', i = 0;

				if( typeof str !== 'string' ){
					str	= String(str);
				}

				while( i < str.length ){
					//all three "& 0xff" added below are there to fix a known bug
					//with bytes returned by xhr.responseText
					var
						  byte1 = str.charCodeAt(i++) & 0xff
						, byte2 = str.charCodeAt(i++) & 0xff
						, byte3 = str.charCodeAt(i++) & 0xff
						, enc1 = byte1 >> 2
						, enc2 = ((byte1 & 3) << 4) | (byte2 >> 4)
						, enc3, enc4
					;

					if( isNaN(byte2) ){
						enc3 = enc4 = 64;
					} else {
						enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
						enc4 = isNaN(byte3) ? 64 : byte3 & 63;
					}

					outStr += b64.charAt(enc1) + b64.charAt(enc2) + b64.charAt(enc3) + b64.charAt(enc4);
				}

				return  outStr;
			}

		} // api
	;
	

	function _emit(target, fn, name, res, ext){
		var evt = {
			  type:		name.type || name
			, target:	target
			, result:	res
		};
		api.extend(evt, ext);
		fn(evt);
	}


	function _hasSupportReadAs(as){
		return	FileReader && !!FileReader.prototype['readAs'+as];
	}


	function _readAs(file, fn, as, encoding){
		if( api.isFile(file) && _hasSupportReadAs(as) ){
			var Reader = new FileReader;

			// Add event listener
			_on(Reader, _readerEvents, function _fn(evt){
				var type = evt.type;
				if( type == 'progress' ){
					_emit(file, fn, evt, evt.target.result, { loaded: evt.loaded, total: evt.total });
				}
				else if( type == 'loadend' ){
					_off(Reader, _readerEvents, _fn);
					Reader = null;
				}
				else {
					_emit(file, fn, evt, evt.target.result);
				}
			});


			try {
				// ReadAs ...
				if( encoding ){
					Reader['readAs'+as](encoding, file);
				}
				else {
					Reader['readAs'+as](file);
				}
			}
			catch (err){
				_emit(file, fn, 'error', undef, { error: err.toString() });
			}
		}
		else {
			_emit(file, fn, 'error', undef, { error: 'filreader_not_support_'+as });
		}
	}


	function _isRegularFile(file, callback){
		// http://stackoverflow.com/questions/8856628/detecting-folders-directories-in-javascript-filelist-objects
		if( !file.type && (file.size % 4096) === 0 && (file.size <= 102400) ){
			if( FileReader ){
				try {
					var Reader = new FileReader();

					_one(Reader, _readerEvents, function (evt){
						var isFile = evt.type != 'error';
						callback(isFile);
						if( isFile ){
							Reader.abort();
						}
					});

					Reader.readAsDataURL(file);
				} catch( err ){
					callback(false);
				}
			}
			else {
				callback(null);
			}
		}
		else {
			callback(true);
		}
	}


	function _getAsEntry(item){
		var entry;
		if( item.getAsEntry ){ entry = item.getAsEntry(); }
		else if( item.webkitGetAsEntry ){ entry = item.webkitGetAsEntry(); }
		return	entry;
	}


	function _readEntryAsFiles(entry, callback){
		if( !entry ){
			// error
			callback('empty_entry');
		}
		else if( entry.isFile ){
			// Read as file
			entry.file(function(file){
				// success
				callback(false, [file]);
			}, function (){
				// error
				callback('entry_file');
			});
		}
		else if( entry.isDirectory ){
			var reader = entry.createReader(), result = [];

			reader.readEntries(function(entries){
				// success
				api.afor(entries, function (next, entry){
					_readEntryAsFiles(entry, function (err, files){
						if( !err ){
							result = result.concat(files);
						}

						if( next ){
							next();
						}
						else {
							callback(false, result);
						}
					});
				});
			}, function (){
				// error
				callback('directory_reader');
			});
		}
		else {
			_readEntryAsFiles(_getAsEntry(entry), callback);
		}
	}


	function _simpleClone(obj){
		var copy = {};
		_each(obj, function (val, key){
			if( val && (typeof val === 'object') ){
				val = api.extend({}, val);
			}
			copy[key] = val;
		});
		return	copy;
	}


	function isInputFile(el){
		return	_rinput.test(el && el.tagName);
	}


	function _getDataTransfer(evt){
		return	(evt.originalEvent || evt || '').dataTransfer || {};
	}


	// Add default image info reader
	api.addInfoReader(/^image/, function (file/**File*/, callback/**Function*/){
		if( !file.__dimensions ){
			var defer = file.__dimensions = api.defer();

			api.readAsImage(file, function (evt){
				var img = evt.target;
				defer.resolve(evt.type == 'load' ? false : 'error', {
					  width:  img.width
					, height: img.height
				});
				img = null;
			});
		}

		file.__dimensions.then(callback);
	});


	// Special event
	api.event.dnd = function (el, onHover, onDrop){
		var _id, _type;

		if( !onDrop ){
			onDrop = onHover;
			onHover = api.F;
		}

		if( FileReader ){
			_on(el, 'dragenter dragleave dragover', function (evt){
				var
					  types = _getDataTransfer(evt).types
					, i = types && types.length
					, debounceTrigger = false
				;

				while( i-- ){
					if( ~types[i].indexOf('File') ){
						evt[preventDefault]();

						if( _type !== evt.type ){
							_type = evt.type; // Store current type of event

							if( _type != 'dragleave' ){
								onHover.call(evt[currentTarget], true, evt);
							}

							debounceTrigger = true;
						}

						break; // exit from "while"
					}
				}

				if( debounceTrigger ){
					clearTimeout(_id);
					_id = setTimeout(function (){
						onHover.call(evt[currentTarget], _type != 'dragleave', evt);
					}, 50);
				}
			});

			_on(el, 'drop', function (evt){
				evt[preventDefault]();

				_type = 0;
				onHover.call(evt[currentTarget], false, evt);

				api.getDropFiles(evt, function (files){
					onDrop.call(evt[currentTarget], files, evt);
				});
			});
		}
		else {
			api.log("Drag'n'Drop -- not supported");
		}
	};


	// Support jQuery
	if( jQuery && !jQuery.fn.dnd ){
		jQuery.fn.dnd = function (onHover, onDrop){
			return this.each(function (){
				api.event.dnd(this, onHover, onDrop);
			});
		};
	}


	// @export
	window.FileAPI  = api.extend(api, window.FileAPI);


	// @configuration
	if( !api.flashUrl ){ api.flashUrl = api.staticPath + 'FileAPI.flash.swf'; }
	if( !api.flashImageUrl ){ api.flashImageUrl = api.staticPath + 'FileAPI.flash.image.swf'; }
})(window);
;/*global FileAPI, document */

(function (api, document, undef){
	'use strict';

	var
		min = Math.min,
		round = Math.round,
		getCanvas = function (){ return document.createElement('canvas'); },
		support = false,
		exitOrientation = {
			  8:	270
			, 3:	180
			, 6:	90
		}
	;

	try {
		support = getCanvas().toDataURL('image/png').indexOf('data:image/png') > -1;
	}
	catch (e){}


	function Image(file, low){
		if( !(this instanceof Image) ){
			return	new Image(file);
		}

		this.file   = file;
		this.better = !low;
		this.matrix	= {
			sx: 0,
			sy: 0,
			sw: 0,
			sh: 0,
			dx: 0,
			dy: 0,
			dw: 0,
			dh: 0,
			resize: 0, // min, max OR preview
			deg: 0
		};
	}
	Image.prototype = {
		constructor: Image,

		set: function (attrs){
			api.extend(this.matrix, attrs);
			return	this;
		},

		crop: function (x, y, w, h){
			if( w === undef ){
				w	= x;
				h	= y;
				x = y = 0;
			}
			return	this.set({ sx: x, sy: y, sw: w, sh: h || w });
		},

		resize: function (w, h, type){
			if( typeof h == 'string' ){
				type = h;
				h = w;
			}

			return	this.set({ dw: w, dh: h, resize: type });
		},

		preview: function (w, h){
			return	this.set({ dw: w, dh: h || w, resize: 'preview' });
		},

		rotate: function (deg){
			return	this.set({ deg: deg });
		},

		_load: function (image, fn){
			var self = this;
			api.readAsImage(image, function (evt){
				fn.call(self, evt.type != 'load', evt.result);
			});
		},

		_apply: function (image, fn){
			var
				  canvas = getCanvas()
				, m = this.getMatrix(image)
				, ctx = canvas.getContext('2d')
				, deg = m.deg
				, dw = m.dw
				, dh = m.dh
				, w = image.width
				, h = image.height
				, copy, buffer = image
			;


			if( this.better ){
				while( Math.min(w/dw, h/dh) > 2 ){
					w = ~~(w/2 + 0.5);
					h = ~~(h/2 + 0.5);

					copy = getCanvas();
					copy.width  = w;
					copy.height = h;

					if( buffer !== image ){
						copy.getContext('2d').drawImage(buffer, 0, 0, buffer.width, buffer.height, 0, 0, w, h);
						buffer = copy;
					}
					else {
						buffer = copy;
						buffer.getContext('2d').drawImage(image, m.sx, m.sy, m.sw, m.sh, 0, 0, w, h);
						m.sx = m.sy = m.sw = m.sh = 0;
					}
				}
			}

			canvas.width  = (deg % 180) ? dh : dw;
			canvas.height = (deg % 180) ? dw : dh;

			ctx.rotate(deg * Math.PI / 180);
			ctx.drawImage(buffer
				, m.sx, m.sy
				, m.sw || buffer.width
				, m.sh || buffer.height
				, (deg == 180 || deg == 270 ? -dw : 0)
				, (deg == 90 || deg == 180 ? -dh : 0)
				, dw, dh
			);

			fn.call(this, false, canvas);
		},

		getMatrix: function (image){
			var
				  m  = api.extend({}, this.matrix)
				, sw = m.sw = m.sw || image.width
				, sh = m.sh = m.sh || image.height
				, dw = m.dw = m.dw || m.sw
				, dh = m.dh = m.dh || m.sh
				, sf = sw/sh, df = dw/dh
				, type = m.resize
			;

			if( type == 'preview' ){
				if( dw != sw || dh != sh ){
					// Make preview
					var w, h;

					if( df >= sf ){
						w	= sw;
						h	= w / df;
					} else {
						h	= sh;
						w	= h * df;
					}

					if( w != sw || h != sh ){
						m.sx	= ~~((sw - w)/2);
						m.sy	= ~~((sh - h)/2);
						sw		= w;
						sh		= h;
					}
				}
			}
			else if( type ){
				if( type == 'min' ){
					dw = round(sf < df ? min(sw, dw) : dh*sf);
					dh = round(sf < df ? dw/sf : min(sh, dh));
				}
				else {
					dw = round(sf >= df ? min(sw, dw) : dh*sf);
					dh = round(sf >= df ? dw/sf : min(sh, dh));
				}
			}

			m.sw = sw;
			m.sh = sh;
			m.dw = dw;
			m.dh = dh;

			return	m;
		},

		_trans: function (fn){
			this._load(this.file, function (err, image){
				if( err ){
					fn(err);
				}
				else {
					this._apply(image, fn);
				}
			});
		},

		get: function (fn){
			if( api.support.transform ){
				var _this = this;

				if( _this.matrix.deg == 'auto' ){
					api.getInfo(this.file, function (err, info){
						// rotate by exif orientation
						_this.matrix.deg = exitOrientation[info && info.exif && info.exif.Orientation] || 0;
						_this._trans(fn);
					});
				}
				else {
					_this._trans(fn);
				}
			}
			else {
				fn('not_support');
			}
		},

		toData: function (fn){
			this.get(fn);
		}

	};


	Image.transform = function (file, transform, autoOrientation, fn){
		api.getInfo(file, function (err, img){
			// img -- info object

			var
				  images = {}
				, queue = api.queue(function (err){
					fn(err, images);
				})
			;

			if( !err ){
				api.each(transform, function (params, name){
					if( !queue.isFail() ){
						var ImgTrans = new Image(img.nodeType ? img : file);

						if( typeof params == 'function' ){
							params(img, ImgTrans);
						}
						else if( params.width ){
							ImgTrans[params.preview ? 'preview' : 'resize'](params.width, params.height, params.type);
						}
						else {
							if( params.maxWidth && (img.width > params.maxWidth || img.height > params.maxHeight) ){
								ImgTrans.resize(params.maxWidth, params.maxHeight, 'max');
							}
						}

						if( params.rotate === undef && autoOrientation ){
							params.rotate = 'auto';
						}

						ImgTrans.rotate(params.rotate);

						queue.inc();
						ImgTrans.toData(function (err, image){
							if( err ){
								queue.fail();
							}
							else {
								images[name] = image;
								queue.next();
							}
						});
					}
				});
			}
			else {
				queue.fail();
			}
		});
	};


	// @export
	api.support.canvas = api.support.transform = support;
	api.Image = Image;
})(FileAPI, document);
;/*global window, FileAPI */

(function (api, window){
	var
		  encode = window.encodeURIComponent
		, document = window.document
		, FormData = window.FormData
		, Form = function (){ this.items = []; }
	;


	Form.prototype = {

		append: function (name, blob, file, type){
			this.items.push({
				  name: name
				, blob: blob && blob.blob || blob
				, file: file || blob.name
				, type:	type || blob.type
			});
		},

		each: function (fn){
			var i = 0, n = this.items.length;
			for( ; i < n; i++ ){
				fn.call(this, this.items[i]);
			}
		},

		toData: function (fn, options){
		    // allow chunked transfer if we have only one file to send
		    // flag is used below and in XHR._send
		    options._chunked = api.support.chunked && options.chunkSize > 0 && api.filter(this.items, function (item){ return item.file; }).length == 1;

			if( !api.support.html5 ){
				api.log('FileAPI.Form.toHtmlData');
				this.toHtmlData(fn);
			}
			else if( this.multipart ){
				api.log('FileAPI.Form.toMultipartData');
				this.toMultipartData(fn);
			}
			else if( options._chunked ){
				api.log('FileAPI.Form.toPlainData');
				this.toPlainData(fn);
			}
			else {
				api.log('FileAPI.Form.toFormData');
				this.toFormData(fn);
			}
		},

		_to: function (data, complete, next, arg){
			var queue = api.queue(function (){
				complete(data);
			});

			this.each(function (file){
				next(file, data, queue, arg);
			});

			queue.check();
		},


		toHtmlData: function (fn){
			this._to(document.createDocumentFragment(), fn, function (file, data/**DocumentFragment*/){
				var blob = file.blob, hidden;

				if( file.file ){
					api.reset(blob);
					// set new name
					blob.name = file.name;
					data.appendChild(blob);
				}
				else {
					hidden = document.createElement('input');
					hidden.name  = file.name;
					hidden.type  = 'hidden';
					hidden.value = blob;
					data.appendChild(hidden);
				}
			});
		},

		toPlainData: function (fn){
			this._to({}, fn, function (file, data, queue){
				if( file.file ){
					data.type = file.file;
				}
				if( file.blob.toBlob ){
				    // canvas
					queue.inc();
					file.blob.toBlob(function (blob){
						data.name = file.name;
						data.file = blob;
						data.size = blob.length;
						data.type = file.type;
						queue.next();
					}, 'image/png');
				}
				else if( file.file ){
				    //file
					data.name = file.blob.name;
					data.file = file.blob;
					data.size = file.blob.size;
					data.type = file.type;
				}
				else {
				    // additional data
				    if (!data.params) {
				        data.params = [];
				    }
				    data.params.push(encodeURIComponent(file.name) + "=" + encodeURIComponent(file.blob));
				}
				data.start = -1;
				data.end = -1;
				data.retry = 0;
			});
		},

		toFormData: function (fn){
			this._to(new FormData, fn, function (file, data, queue){
				if( file.file ){
					data.append('_'+file.name, file.file);
				}

				if( file.blob && file.blob.toBlob ){
					queue.inc();
					file.blob.toBlob(function (blob){
						data.append(file.name, blob, file.file);
						queue.next();
					}, 'image/png');
				}
				else if( file.file ){
					data.append(file.name, file.blob, file.file);
				}
				else {
					data.append(file.name, file.blob);
				}
			});
		},


		toMultipartData: function (fn){
			this._to([], fn, function (file, data, queue, boundary){
				data.push(
					  '--_' + boundary + ('\r\nContent-Disposition: form-data; name="'+ file.name +'"'+ (file.file ? '; filename="'+ encode(file.file) +'"' : '')
					+ (file.file ? '\r\nContent-Type: '+ (file.type || 'application/octet-stream') : '')
					+ '\r\n'
					+ '\r\n'+ (file.file ? file.blob : encode(file.blob))
					+ '\r\n')
				);
			}, api.expando);
		}
	};


	// @export
	api.Form = Form;
})(FileAPI, window);
;/*global window, FileAPI, Uint8Array */

(function (window, api){
	var
		  noop = function (){}
		, document = window.document

		, XHR = function (options){
			this.uid = api.uid();
			this.xhr = {
				  abort: noop
				, getResponseHeader: noop
				, getAllResponseHeaders: noop
			};
			this.options = options;
		}
	;


	XHR.prototype = {
		status: 0,
		statusText: '',

		getResponseHeader: function (name){
			return this.xhr.getResponseHeader(name);
		},

		getAllResponseHeaders: function (){
			return this.xhr.getAllResponseHeaders() || {};
		},

		end: function (status, statusText){
			var _this = this, options = _this.options;

			_this.end		=
			_this.abort		= noop;
			_this.status	= status;

			if( statusText ){
				_this.statusText = statusText;
			}

			api.log('xhr.end:', status, statusText);
			options.complete(status == 200 || status == 201 ? false : _this.statusText || 'unknown', _this);

			if( _this.xhr && _this.xhr.node ){
				setTimeout(function (){
					var node = _this.xhr.node;
					try { node.parentNode.removeChild(node); } catch (e){}
					try { delete window[_this.uid]; } catch (e){}
					window[_this.uid] = _this.xhr.node = null;
				}, 9);
			}
		},

		abort: function (){
			this.end(0, 'abort');

			if( this.xhr ){
			    this.xhr.aborted = true;
				this.xhr.abort();
			}
		},

		send: function (FormData){
			var _this = this, options = this.options;

			FormData.toData(function (data){
				// Start uploading
				options.upload(options, _this);
				_this._send.call(_this, options, data);
			}, options);
		},

		_send: function (options, data){
			var _this = this, xhr, uid = _this.uid, url = options.url;

			api.log('XHR._send:', data);

			// No cache
			url += (~url.indexOf('?') ? '&' : '?') + api.uid();

			if( data.nodeName ){
				// legacy
				options.upload(options, _this);

				xhr = document.createElement('div');
				xhr.innerHTML = '<form target="'+ uid +'" action="'+ url +'" method="POST" enctype="multipart/form-data" style="position: absolute; top: -1000px; overflow: hidden; width: 1px; height: 1px;">'
							+ '<iframe name="'+ uid +'" src="javascript:false;"></iframe>'
							+ '<input value="'+ uid +'" name="callback" type="hidden"/>'
							+ '</form>'
				;

				_this.xhr.abort = function (){
					var transport = xhr.getElementsByName('iframe')[0];
					if( transport ){
						try {
							if( transport.stop ){ transport.stop(); }
							else if( transport.contentWindow.stop ){ transport.contentWindow.stop(); }
							else { transport.contentWindow.document.execCommand('Stop'); }
						}
						catch (er) {}
					}
					xhr = null;
				};

				// append form-data
				var form = xhr.getElementsByTagName('form')[0];
				form.appendChild(data);

				api.log(form.parentNode.innerHTML);

				// append to DOM
				document.body.appendChild(xhr);

				// keep a reference to node-transport
				_this.xhr.node = xhr;

				// jsonp-callack
				window[uid] = function (status, statusText, response){
					_this.readyState	= 4;
					_this.responseText	= response;
					_this.end(status, statusText);
					xhr = null;
				};

				// send
				_this.readyState = 2; // loaded
				form.submit();
				form = null;
			}
			else {
				// html5
				xhr = _this.xhr = api.getXHR();

				if (data.params) {
				    url += (url.indexOf('?') < 0 ? "?" : "&") + data.params.join("&");
				}

				xhr.open('POST', url, true);
				xhr.withCredential = "true";

				if( !options.headers || !options.headers['X-Requested-With'] ){
					xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
				}

				api.each(options.headers, function (val, key){
					xhr.setRequestHeader(key, val);
				});

				
				if ( options._chunked ) {
					// chunked upload
					if( xhr.upload ){
						xhr.upload.addEventListener('progress', function (/**Event*/evt){
							if (!data.retry) {
							    // show progress only for correct chunk uploads
								options.progress({
									  type:			evt.type
									, total:		data.size
									, loaded:		data.start + evt.loaded
									, totalSize:	data.size
								}, _this, options);
							}
						}, false);
					}

					xhr.onreadystatechange = function (){
						_this.status     = xhr.status;
						_this.statusText = xhr.statusText;
						_this.readyState = xhr.readyState;

						if( xhr.readyState == 4 ){
							for( var k in { '': 1, XML: 1, Text: 1, Body: 1 } ){
								_this['response'+k]  = xhr['response'+k];
							}
							xhr.onreadystatechange = null;
                            
							if (!xhr.status || xhr.status - 201 > 0) {
							    api.log("Error: " + xhr.status);
								// some kind of error
								// 0 - connection fail or timeout, if xhr.aborted is true, then it's not recoverable user action
								// up - server error
								if (((!xhr.status && !xhr.aborted) || 500 == xhr.status || 416 == xhr.status) && ++data.retry <= options.chunkUploadRetry) {
									// let's try again the same chunk
									// only applicable for recoverable error codes 500 && 416

									var to = xhr.status ? 0
									                    : api.chunkNetworkDownRetryTimeout;

								    // inform about recoverable problems
									options.pause(data.file, options);

									// smart restart if server reports about the last known byte
									var lkb = xhr.getResponseHeader('X-Last-Known-Byte');
									api.log("X-Last-Known-Byte: " + lkb);
									if (lkb) {
										data.end = parseInt(lkb, 10);
									} else {
										data.end = data.start - 1;
									}

									setTimeout(function () {
									    _this._send(options, data);
									}, to);
								} else {
									// no mo retries
									_this.end(xhr.status);
								}
							} else {
								// success
								data.retry = 0;

								if (data.end == data.size - 1) {
									// finished
									_this.end(xhr.status);
								} else {
									// next chunk
									setTimeout(function () {
									    _this._send(options, data);
									}, 0);
								}
							}
							xhr = null;
						}
					};

					data.start = data.end + 1;
					data.end = Math.min(data.start + options.chunkSize, data.size ) - 1;
                    
					var slice;
					(slice = 'slice') in data.file || (slice = 'mozSlice') in data.file || (slice = 'webkitSlice') in data.file;

					xhr.setRequestHeader("Content-Range", "bytes " + data.start + "-" + data.end + "/" + data.size);
					xhr.setRequestHeader("Content-Disposition", 'attachment; filename=' + encodeURIComponent(data.name));
					xhr.setRequestHeader("Content-Type", data.type || "application/octet-stream");
                    
					slice = data.file[slice](data.start, data.end + 1);
                 
					xhr.send(slice);
					slice = null;
				} else {
					// single piece upload
					if( xhr.upload ){
						// https://github.com/blueimp/jQuery-File-Upload/wiki/Fixing-Safari-hanging-on-very-high-speed-connections-%281Gbps%29
						xhr.upload.addEventListener('progress', api.throttle(function (/**Event*/evt){
							options.progress(evt, _this, options);
						}, 100), false);
					}
				    
					xhr.onreadystatechange = function (){
						_this.status     = xhr.status;
						_this.statusText = xhr.statusText;
						_this.readyState = xhr.readyState;

						if( xhr.readyState == 4 ){
							for( var k in { '': 1, XML: 1, Text: 1, Body: 1 } ){
								_this['response'+k]  = xhr['response'+k];
							}
							xhr.onreadystatechange = null;
							_this.end(xhr.status);
							xhr = null;
						}
					};

					if( api.isArray(data) ){
						// multipart
						xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=_'+api.expando);
						data = data.join('') +'--_'+ api.expando +'--';

						/** @namespace  xhr.sendAsBinary  https://developer.mozilla.org/ru/XMLHttpRequest#Sending_binary_content */
						if( xhr.sendAsBinary ){
							xhr.sendAsBinary(data);
						}
						else {
							var bytes = Array.prototype.map.call(data, function(c){ return c.charCodeAt(0) & 0xff; });
							xhr.send(new Uint8Array(bytes).buffer);

						}
					} else {
						// FormData 
						xhr.send(data);
					}
				}
			}
		}
	};


	// @export
	api.XHR = XHR;
})(window, FileAPI);
