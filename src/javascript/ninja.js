(function(codeMirror, angular) {
  'use strict';

  if (!codeMirror) 
    throw new Error('Ninja.init(); CodeMirror is required.');

  /*===============================================
  =            Bootstrap main function            =
  ===============================================*/ 
  (function(fn) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      module.exports = fn;
    else if (typeof define == "function" && define.amd) // AMD
      return define([], fn);
    else if (angular) // Angular.js
      angular
        .module('ninja', ['upyun'])
        .service('ninja', ninja)
        .directive('ninja', [
          'ninja','$upyun', '$timeout', 
          ninjaDirective]
        );
    else
      window.ninja = fn;
  })(Ninja);

  /*====================================
  =            Editor Ninja            =
  ====================================*/
  function Ninja(el, options) {
    if (!el && !options)
      return this;
    this.element = el;
    this.options = options || {};
    if (this.element)
      return this.render();
  }

  /*==================================================
  =            Editor Prototype functions            =
  ==================================================*/  

  /**
  *
  * Set a key-value pair to instance
  * 
  * @example
  *   (new Ninja()).set('element', document.getElementById('my-ele'))
  *
  **/
  Ninja.prototype.set = function set(key, value) {
    if (key && value)
      this[key] = value;
    return this;
  };

  /**
  *
  * Set/Get a key-value pair to instance.keyMap
  *
  * @example
  *   GET: (new Ninja()).shortcut('bold');
  *   SET: (new Ninja()).shortcut('bold', 'Cmd-Alt-B');
  *
  **/
  Ninja.prototype.shortcut = function shortcut(key, value) {
    if (!this.keyMaps)
      this.keyMaps = {};
    if (key && !value)
      return this.keyMaps[key];
    if (key && value)
      this.keyMaps[key] = value;
    return this;
  };

  /**
  *
  * Add toolbar button
  *
  * @example
  *   (new Ninja()).tool('customTool', function(){ console.log('new tool!') })
  *
  **/
  Ninja.prototype.tool = function tool(name, metaString) {
    if (!name || typeof(name) !== 'string')
      return;

    if (!this.toolbar)
      this.toolbar = [];

    if (arguments.length === 1) {
      this.toolbar.push(name);
      return this;
    }

    var fn = arguments[arguments.length - 1];
    var toolItem = {};
    toolItem.name = name;
    toolItem.class = 'ninja-tool-' + name;

    if (typeof(metaString) === 'string') {
      if (metaString.indexOf('http') === 0 || metaString.indexOf('https') === 0)
        toolItem.href = metaString;
      else
        toolItem.html = metaString;
    }

    if (fn && typeof(fn) === 'function')
      toolItem.action = fn;

    this.toolbar.push(toolItem);

    return this;
  };

  /**
  *
  * Renderer of Ninja editor
  *
  * @example
  *   (new Ninja()).render();
  *
  **/
  Ninja.prototype.render = function render() {
    var ele = this.element || document.getElementsByTagName('textarea')[0];

    if (!ele) 
      throw new Error('ninja.render(); ninja requires a vaild element to render');
    if (this._rendered && this._rendered === ele) 
      return;

    this.keyMaps = initKeyMaps(this.keyMaps);
    var codeMirrorOptions = {};
    codeMirrorOptions.mode = {
      name: 'markdown',
      underscoresBreakWords: false,
      taskLists: true,
      fencedCodeBlocks: true,
      highlightFormatting: true
    };
    codeMirrorOptions.theme = 'zen';
    codeMirrorOptions.lineNumbers = false;
    codeMirrorOptions.lineWrapping = true;
    codeMirrorOptions.autoCloseBrackets = true;
    codeMirrorOptions.extraKeys = initKeyMaps(this.keyMaps);

    if (ele.value !== '') 
      codeMirrorOptions.value = ele.value;

    this.codemirror = new codeMirror.fromTextArea(ele, codeMirrorOptions);
    this.codemirror.on('change', fixCodeHighlight);

    if (codeMirrorOptions.value)
      findCodesAndAddClass(this.codemirror, 'ff-monospace');

    if (!this.options || (this.options && this.options.toolbar !== false)) {
      this.createToolbar(this.toolbar || initToolbar());
    }
    if (!this.options || (this.options && this.options.statusbar !== false)) 
      this.createStatusbar();

    this._rendered = ele;
    return this;
  };

  /**
  *
  * Create a toolbar on top of the editor
  *
  **/
  Ninja.prototype.createToolbar = function(items) {
    if (!items || items.length === 0) return;

    var bar = document.createElement('div');
    bar.className = 'editor-toolbar';

    var self = this;

    var el;
    self.tools = {};

    for (var i = 0; i < items.length; i++) {
      (function(item) {
        var el = createIcon(item, self.keyMaps);
        self.tools[item.name || item] = el;
        bar.appendChild(el);
      })(items[i]);
    }

    // toggle active status
    var cm = this.codemirror;
    cm.on('cursorActivity', function() {
      var stat = getState(cm);

      for (var key in self.tools) {
        (function(key) {
          var el = self.tools[key];
          if (stat[key]) {
            el.className += ' active';
          } else {
            el.className = el.className.replace(/\s*active\s*/g, '');
          }
        })(key);
      }
    });

    var cmWrapper = cm.getWrapperElement();
    cmWrapper.parentNode.insertBefore(bar, cmWrapper);
    return bar;
  };

  /**
  *
  * Create a statusbar on bottom of the editor
  *
  **/  
  Ninja.prototype.createStatusbar = function createStatusbar(status) {
    status = status || this.statusbar;

    if (!status || status.length === 0) return;

    var bar = document.createElement('div');
    bar.className = 'editor-statusbar';

    var pos, cm = this.codemirror;
    for (var i = 0; i < status.length; i++) {
      (function(statusButton) {
        var el = document.createElement('span');
        el.className = statusButton.name;
        // append text if provided.
        if (statusButton.text) {
          var text = document.createElement('span');
          text.className = 'statusbar-text';
          text.innerHTML = statusButton.text;
        }
        if (statusButton.name === 'words') {
          el.innerHTML = '0';
          cm.on('update', function() {
            el.innerHTML = wordCount(cm.getValue());
          });
        } else if (statusButton.name === 'lines') {
          el.innerHTML = '0';
          cm.on('update', function() {
            el.innerHTML = cm.lineCount();
          });
        } else if (statusButton.name === 'cursor') {
          el.innerHTML = '0:0';
          cm.on('cursorActivity', function() {
            pos = cm.getCursor();
            el.innerHTML = pos.line + ':' + pos.ch;
          });
        }
        // append text before real stats
        if (statusButton.text)
          bar.appendChild(text);
        bar.appendChild(el);
      })(status[i]);
    }
    var cmWrapper = this.codemirror.getWrapperElement();
    cmWrapper.parentNode.insertBefore(bar, cmWrapper.nextSibling);
    return bar;
  };
  
  /**
  *
  * Inject editor's utils to editor instance
  *
  * @example
  *   (new Editor()).toggle('bold');
  *   (new Editor()).draw('image');
  *
  **/
  Ninja.prototype.toggle = function(type) {
    return toggle(type)(this.codemirror);
  }
  Ninja.prototype.draw = function(type) {
    return draw(type)(this.codemirror);
  };
  Ninja.prototype.trigger = function(type) {
    return trigger(type)(this.codemirror);
  };
  Ninja.prototype.inject = function() {
    return inject(this.codemirror, arguments);
  }

  /*======================================
  =            Editor's Utils            =
  ======================================*/
  
  /**
  *
  * Toggle Whatever you like
  *
  * @status: enabled
  * @example
  *   toggle('bold');
  *   toggle('italic');
  *   toggle('quote');
  *   toggle('unordered-list');
  *   toggle('ordered-list');
  *   toggle('fullscreen');
  *
  **/
  function toggle(type) {
    var toggleTextList = ['bold', 'italic'];

    return toggleWhatever;

    function toggleWhatever(cm) {
      if (!cm) 
        return;
      if (toggleTextList.indexOf(type) > -1)
        return toggleText(type)(cm);
      if (type === 'fullscreen')
        return toggleFullScreen(cm);

      return toggleBlock(type, cm);
    }

    /**
    *
    * Toggle a line to selected block style
    *
    * @status: enabled
    * @example
    *   toggle('quote');
    *   toggle('ordered-list');
    *   toggle('unordered-list');
    *
    **/
    function toggleBlock(type, cm) {
      var stat = getState(cm);
      var startPoint = cm.getCursor('start');
      var endPoint = cm.getCursor('end');
      var styleMap = {
        'quote': {
          re: /^(\s*)\>\s+/,
          prepend: '> '
        },
        'unordered-list': {
          re: /^(\s*)(\*|\-|\+)\s+/,
          prepend: '* '
        },
        'ordered-list': {
          re: /^(\s*)\d+\.\s+/,
          prepend: '. '
        }
      };
      var style = styleMap[type];
      for (var i = startPoint.line; i <= endPoint.line; i++) {
        (function(i) {
          var text = cm.getLine(i);

          // TODO: Object.keys() function may not exist in older browers.
          var olderTypes = Object.keys(stat);
          var hasTypeBefore = olderTypes.length > 0 && type !== olderTypes[0];

          if (hasTypeBefore)
            text = text.replace(styleMap[olderTypes[0]].re, '$1');

          if (stat[type]) {
            text = text.replace(style.re, '$1');
          } else {
            text = (type === 'ordered-list') ?
              ((i + 1) + style.prepend + text) :  
              style.prepend + text;
          }
          setLine(i, text, cm);
        })(i);
      }
      cm.focus();
    }

    /**
    *
    * Toggle a wrappered text to seleced style.
    *
    * @status: enabled
    * @example
    *   toggleText('bold') => fn(cm);
    *   toggleText('italic') => fn(cm);
    *
    **/
    function toggleText(type) {
      var styleMap = {
        bold: {
          start: '**',
          end: '**',
          re: {
            start: /^(.*)?(\*|\_){2}(\S+.*)?$/,
            end: /^(.*\S+)?(\*|\_){2}(\s+.*)?$/
          },
          offset: 2
        },
        italic: {
          start: '*',
          end: '*',
          re: {
            start: /^(.*)?(\*|\_)(\S+.*)?$/,
            end: /^(.*\S+)?(\*|\_)(\s+.*)?$/
          },
          offset: 1
        }
      };

      return toggleTextByStyle;

      function toggleTextByStyle(cm) {
        var style = styleMap[type];
        var stat = getState(cm);
        var text;

        var start = style.start;
        var end = style.end;

        var startPoint = cm.getCursor('start');
        var endPoint = cm.getCursor('end');

        if (stat[type]) {
          text = cm.getLine(startPoint.line);
          start = text.slice(0, startPoint.ch);
          end = text.slice(startPoint.ch);

          start = start.replace(style.re.start, '$1$3');
          end = end.replace(style.re.end, '$1$3');

          startPoint.ch -= style.offset;
          endPoint.ch -= style.offset;

          setLine(startPoint.line, start + end, cm);
        } else {
          text = cm.getSelection();
          cm.replaceSelection(start + text + end);

          startPoint.ch += style.offset;
          endPoint.ch += style.offset;
        }
        cm.setSelection(startPoint, endPoint);
        cm.focus();
      }
    }

    /**
     * 
     * Toggle full screen of the editor.
     * Checkout 
     * https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
     * 
     */
    function toggleFullScreen(cm) {
      var el = cm.getWrapperElement();
      var doc = document;
      var isFull = doc.fullScreen || doc.mozFullScreen || doc.webkitFullScreen;

      if (!isFull)
        request();
      else if (cancel)
        cancel();

      function request() {
        if (el.requestFullScreen)
          el.requestFullScreen();
        else if (el.mozRequestFullScreen)
          el.mozRequestFullScreen();
        else if (el.webkitRequestFullScreen)
          el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
      }

      function cancel() {
        if (doc.cancelFullScreen)
          doc.cancelFullScreen();
        else if (doc.mozCancelFullScreen)
          doc.mozCancelFullScreen();
        else if (doc.webkitCancelFullScreen)
          doc.webkitCancelFullScreen();
      }
    }

    /**
    *
    * Toggle a preview mode
    * 
    * @todo [enable after rewriting...]
    * @status: disabled
    * @example
    *   togglePreview(editor);
    *
    **/
    function togglePreview(editor) {
      var toolbar = editor.toolbar.preview;
      var parse = editor.constructor.markdown;
      var cm = editor.codemirror;
      var wrapper = cm.getWrapperElement();
      var preview = wrapper.lastChild;
      if (!/editor-preview/.test(preview.className)) {
        preview = document.createElement('div');
        preview.className = 'editor-preview';
        wrapper.appendChild(preview);
      }
      if (/editor-preview-active/.test(preview.className)) {
        preview.className = preview.className.replace(
          /\s*editor-preview-active\s*/g, ''
        );
        toolbar.className = toolbar.className.replace(/\s*active\s*/g, '');
      } else {
        /* When the preview button is clicked for the first time,
         * give some time for the transition from editor.css to fire and the view to slide from right to left,
         * instead of just appearing.
         */
        setTimeout(function() {preview.className += ' editor-preview-active'}, 1);
        toolbar.className += ' active';
      }
      var text = cm.getValue();
      preview.innerHTML = parse(text);
    }
  }

  /**
  *
  * Draw something, and wrap current cursor inside.
  *
  * @example
  *   draw('link'); => [<cursor>](http://)
  *   draw('image'); => ![<cursor>](http://)
  *
  **/
  function draw(type) {
    var placeholders = {
      link: ['[', '](http://)'],
      image: ['![', '](http://)']
    };

    return drawWhatever;

    function drawWhatever(cm) {
      var stat = getState(cm);
      inject(cm, placeholders[type], stat[type]);
    }
  }

  /**
  *
  * Trigger built-in method of CodeMirror
  * And focus on the right cursor later.
  * 
  * @example
  *   trigger('undo') => editor.codemirror.undo();
  *   trigger('redo') => editor.codemirror.redo();
  *
  **/
  function trigger(type) {
    return triggerBuiltinMethod;

    function triggerBuiltinMethod(cm) {
      if (!cm[type]) return;
      cm[type]();
      cm.focus();
    }
  }

  /**
   * 
   * The state of CodeMirror at the given position.
   *
   */
  function getState(cm, pos) {
    pos = pos || cm.getCursor('start');
    var stat = cm.getTokenAt(pos);

    if (!stat.type) return {};

    var types = stat.type.split(' ');

    var ret = {}, data, text;
    for (var i = 0; i < types.length; i++) {
      switch (types[i]) {
        case 'strong':
          ret.bold = true;
        break;
        case 'quote':
          ret.quote = true;
        break;
        case 'em':
          ret.italic = true;
        case 'link':
          ret.link = true;
        case 'variable-2':
          text = cm.getLine(pos.line);
          if (/^\s*\d+\.\s/.test(text))
            ret['ordered-list'] = true;
          else
            ret['unordered-list'] = true;
        break;
        default:
        break;
      }
    }
    return ret;
  }

  /**
  *
  * inject text into current Pos
  *
  * @param {[Array]} [texts]
  *
  **/
  function inject(cm, texts, triggered) {
    if (!cm) return;

    var startPoint = cm.getCursor('start');
    var endPoint = cm.getCursor('end');
    var text = cm.getSelection();
    // todo: toggle link/image 

    cm.replaceSelection(
      texts.length > 1 ? 
      texts[0] + text + texts[1] :
      text + texts.join()
    );

    if (texts.length > 1) {
      startPoint.ch += texts[0].length;
      endPoint.ch += texts[0].length;
    }

    cm.setSelection(startPoint, endPoint);
    cm.focus();
  }

  /**
   * Create icon element for toolbar.
   */
  function createIcon(item, defaultKeys) {
    var isNotLink = typeof(item) === 'string';
    var name = item.name || item;

    if (isNotLink) {
      var sep = document.createElement('i');
      sep.className = 'separator';
      sep.innerHTML = name;
      return sep;
    }

    var el = document.createElement('a');

    if (defaultKeys[name]) {
      el.title = defaultKeys[name];
      el.title = el.title.replace('Cmd', '⌘');
      if (/Mac/.test(navigator.platform))
        el.title = el.title.replace('Alt', '⌥');
    }

    if (item.href) {
      el.href = item.href;
      el.target = '_blank';
    }

    if (item.html) 
      el.innerHTML = item.html;

    el.className += item.class || 'icon-' + name;

    if (item.action) {
      el.onclick = function(eve) {
        item.action(self, el, eve);
      };
    }
    return el;
  }

  /**
  *
  * The right word count in respect for CJK
  *
  **/
  function wordCount(data) {
    var pattern = /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
    var m = data.match(pattern);
    var count = 0;
    if( m === null ) return count;
    for (var i = 0; i < m.length; i++) {
      if (m[i].charCodeAt(0) >= 0x4E00) {
        count += m[i].length;
      } else {
        count += 1;
      }
    }
    return count;
  }

  function setLine(line, text, cm) {
    var lineStart = {
      line: line,
      ch: 0
    };
    var lineEnd = {
      line: line
    };
    cm.replaceRange(text, lineStart, lineEnd);
  }

  function findCodesAndAddClass(cm, className) {
    var codeBreakLines = [];
    cm.eachLine(function(line){
      var isCodeBlock = line.text.indexOf('```') === 0;
      if (!isCodeBlock) return;
      var lineNumber = cm.getLineNumber(line);
      codeBreakLines.push(lineNumber);
    });
    for (var i = 0; i < codeBreakLines.length; i++) {
      (function(index){
        if ((index + 1) % 2 === 0) return;
        if (!codeBreakLines[index + 1]) return;

        var codeStart = codeBreakLines[index];
        var codeEnd = codeBreakLines[index + 1];
        var codes = codeEnd - codeStart;

        if (codes === 1) return;
        
        var count = codeStart + 1;
        for (var i = 0; i < (codes - 1); i++) {
          (function(i){
            cm.addLineClass(count, 'text', className);
            count ++;
          })(codes[i]);
        };
      })(i);
    };
  }

  function fixCodeHighlight(cm) {
    var startPoint = cm.getCursor('start');
    var token = cm.getTokenAt(startPoint);
    var codeTypeList = ['variable', 'comment', 'formatting-code-block', 'property', 'number', 'tag']
    if (!token.type) return;
    var types = token.type.split(' ');
    if (codeTypeList.indexOf(types[0]) > -1)
      cm.addLineClass(startPoint.line, 'text', 'ff-monospace');
  }

  /*=============================================
  =            Init functions                   =
  =============================================*/  
  
  /**
  *
  * Init shortcut keyMap, if customKeyMap provided,
  * merge customKeyMap to default KeyMap.
  *
  **/
  function initKeyMaps(customKeyMaps) {
    var defaultKeyMaps = {
      'Cmd-K': draw('link'),
      'Cmd-Alt-I': draw('image'),
      'Cmd-B': toggle('bold'),
      'Cmd-I': toggle('italic'),
      "Cmd-'": toggle('quote'),
      'Cmd-L': toggle('unordered-list'),
      'Cmd-Alt-L': toggle('ordered-list'),
      'Enter': 'newlineAndIndentContinueMarkdownList'
    };
    return formatKeyObject(customKeyMaps || defaultKeyMaps);

    function formatKeyObject(obj) {
      var isMac = /Mac/.test(navigator.platform);
      for (var key in obj) {
        (function(key) {
          obj[format(key)] = obj[key];
        })(key);
      }
      return obj;

      function format(name) {
        if (isMac)
          name = name.replace('Ctrl', 'Cmd');
        else
          name = name.replace('Cmd', 'Ctrl');
        return name;
      }
    }
  }

  /**
  *
  * Init default Toolbar
  *
  * @param {[Obejct]} [customToolbar]
  *
  **/
  function initToolbar(customToolbar) {
    var defaultToolbar = [
      {name: 'bold', action: toggle('bold')},
      {name: 'italic', action: toggle('italic')},
      '|',
      {name: 'quote', action: toggle('quote')},
      {name: 'unordered-list', action: toggle('unordered-list')},
      {name: 'ordered-list', action: toggle('ordered-list')},
      '|',
      {name: 'link', action: draw('link')},
      {name: 'image', action: draw('image')},
      {name: 'uploadImage', action: draw('upload-image')},
      '|',
      {name: 'fullscreen', action: toggle('fullscreen')}
    ];
    return customToolbar || defaultToolbar;
  }

  /*=============================================
  =               Directives                    =
  =============================================*/  

  function ninjaDirective(ninja, $upyun, $timeout) {
    var directive = {
      restrict: 'AE',
      require: 'ngModel',
      link: link
    };
    return directive;

    function link(scope, element, attrs, ctrl) {
      var $ = angular.element;
      var validUploadConfigs = $upyun && (airpubConfigs.upyun || airpubConfigs.qiniu);
      // add class
      $(element).addClass('editor');
      // check if lepture's editor class exists
      if (!window.Editor) return false;
      // init editor instance
      window.editor = new Editor({
        toolbar: [{
            name: 'bold',
            action: Editor.toggleBold
          }, {
            name: 'italic',
            action: Editor.toggleItalic
          },
          '|', {
            name: 'quote',
            action: Editor.toggleBlockquote
          }, {
            name: 'unordered-list',
            action: Editor.toggleUnOrderedList
          }, {
            name: 'ordered-list',
            action: Editor.toggleOrderedList
          },
          '|', {
            name: 'link',
            action: Editor.drawLink
          }, {
            name: 'image',
            action: Editor.drawImage
          }, {
            name: 'upload',
            action: uploadAndDrawImage
          }, {
            name: 'fullscreen',
            action: Editor.toggleFullScreen
          }
        ]
      });
      editor.render();
      editor.codemirror.on('change', onChange);

      // upyun configs
      if (validUploadConfigs) {
        $upyun.set('bucket', airpubConfigs.upyun.bucket);
        $upyun.set('form_api_secret', airpubConfigs.upyun.form_api_secret);
      }

      // model => view
      ctrl.$render = function() {
        if (!editor) return;
        editor.codemirror.setValue(
          ctrl.$isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue
        );
        // refesh content by force
        $timeout(function() {
          editor.codemirror.refresh();
        }, 0);
      };

      // view => model
      function onChange() {
        ctrl.$setViewValue(editor.codemirror.getValue());
      }

      // upload images and fill uri
      function uploadAndDrawImage() {
        var uploading = false;
        var cm = editor.codemirror;
        var stat = editor.getState(cm);
        if (!validUploadConfigs) {
          return editor.replaceSelection(cm, stat.image,
            '![', '](http://)' // uri to be filled.
          );
        }
        if (!document.getElementById('fileUpload')) {
          var hiddenInputFile = document.createElement('input');
          hiddenInputFile.id = 'fileUpload';
          hiddenInputFile.type = 'file';
          hiddenInputFile.name = 'file';
          hiddenInputFile.style.display = 'none';
          $(element).after(hiddenInputFile);
        }
        // trigger click
        var inputButton = document.getElementById('fileUpload');
        inputButton.click();
        // begin upload
        $(inputButton).on('change', function(eve) {
          if (uploading) return;
          uploading = true;
          $upyun.upload(attrs.formName || 'articleForm', function(err, response, image) {
            uploading = false;
            if (err) return console.error(err);
            var uploadOk = image.code === 200 && image.message === 'ok';
            if (!uploadOk) return;
            editor.replaceSelection(cm, stat.image,
              '![', '](' + image.absUrl + ')' // uri to be filled.
            );
          });
        });
      }
    }
  }
})(window.CodeMirror,window.angular);
