(function(codeMirror, angular) {
  'use strict';

  if (!codeMirror) 
    throw new Error('EditorNinja.init(); CodeMirror is required.');

  /*===============================================
  =            Bootstrap main function            =
  ===============================================*/ 
  (function(fn, directive) {
    if (typeof exports == "object" && typeof module == "object") {// CommonJS
      module.exports = fn;
    } else if (typeof define == "function" && define.amd) { // AMD 
      return define([], fn);
    }
    if (angular) { // Angular.js 
      angular
        .module('EditorNinja', [])
        .directive('editorNinja', ['$timeout', directive]);
    }
    if (window)
      window.EditorNinja = fn;
  })(Ninja, ninjaDirective);

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
  Ninja.prototype.set = setAttr;

  function setAttr(key, value) {
    if (key && value)
      this[key] = value;
    return this;
  }

  /**
  *
  * Set/Get a key-value pair to instance.keyMap
  *
  * @example
  *   GET: (new Ninja()).key('bold');
  *   SET: (new Ninja()).key('bold', 'Cmd-Alt-B');
  *
  **/
  Ninja.prototype.key = addKey;

  function addKey(key, value) {
    if (!this.keyMaps)
      this.keyMaps = {};
    if (key && !value)
      return this.keyMaps[key];
    if (key && value)
      this.keyMaps[key] = value;
    return this;
  }

  /**
  *
  * Add toolbar button
  *
  * @example
  *   (new Ninja()).tool('customTool', function(){ console.log('new tool!') })
  *
  **/
  Ninja.prototype.tool = addTool;

  function addTool(name, metaString) {
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
  * Try to find a tool's action function by its name
  * @param {[String]} [name] [the name of this tool]
  * @return {[Function|null]}
  *
  **/
  function findTool(name) {
    if (!Ninja) 
      return;
    if (!Ninja.toolbar || !Ninja.toolbar.length) 
      return null;

    var tool = null;
    for (var i = 0; i < Ninja.toolbar.length; i++) {
      (function(index){
        var item = Ninja.toolbar[index];
        if (item && item.name && item.name === name)
          tool = item;
      })(i)
    };

    return tool;
  }

  /**
  *
  * Renderer of Ninja editor
  *
  * @example
  *   (new Ninja()).render();
  *
  **/
  Ninja.prototype.render = render;

  function render() {
    var ele = this.element || document.getElementsByTagName('textarea')[0];

    if (!ele) 
      throw new Error('Ninja.render(); ninja requires a vaild element to render');
    if (this._rendered && this._rendered === ele) 
      return;

    // extends builtin keymap
    this.keyMaps = initKeyMaps(Ninja.keyMaps);

    var codeMirrorOptions = {
      theme: 'zen',
      tabSize: 2,
      lineNumbers: false,
      lineWrapping: true,
      autoCloseBrackets: true,
      extraKeys: this.keyMaps,
      mode: {
        name: 'markdown',
        underscoresBreakWords: false,
        taskLists: true,
        fencedCodeBlocks: true
      }
    };

    if (ele.value !== '') 
      codeMirrorOptions.value = ele.value;

    this.codemirror = new codeMirror.fromTextArea(ele, codeMirrorOptions);
    this.codemirror.on('change', fixCodeHighlight);

    if (codeMirrorOptions.value)
      findCodesAndAddClass(this.codemirror, 'ff-monospace');

    if (!this.options || (this.options && this.options.toolbar !== false))
      this.createToolbar(this.toolbar || initToolbar(null, this.codemirror));

    if (!this.options || (this.options && this.options.statusbar !== false)) 
      this.createStatusbar();

    this._rendered = ele;
    return this;
  }

  /**
  *
  * Create a toolbar on top of the editor
  *
  **/
  Ninja.prototype.createToolbar = createToolbar;

  function createToolbar(items) {
    if (!items || items.length === 0) return;

    var bar = document.createElement('div');
    bar.className = 'editor-toolbar';

    var self = this;
    var el;
    self.tools = {};

    for (var i = 0; i < items.length; i++) {
      (function(item) {
        var el = createIcon(item, self);
        // if element is invalid
        if (!el) return;
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
          if (stat[key])
            el.className += ' active';
          else
            el.className = el.className.replace(/\s*active\s*/g, '');
        })(key);
      }
    });

    var cmWrapper = cm.getWrapperElement();
    cmWrapper.parentNode.insertBefore(bar, cmWrapper);

    return bar;
  }

  /**
  *
  * Create a statusbar on bottom of the editor
  *
  **/  
  Ninja.prototype.createStatusbar = createStatusbar;

  function createStatusbar(status) {
    return; // disable for tmp
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
  }
  
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
  };
  Ninja.prototype.getValue = function() {
    if (!this.codemirror) return null;
    return this.codemirror.getValue.apply(this.codemirror, arguments);
  };
  Ninja.prototype.setValue = function() {
    if (!this.codemirror) return null;
    return this.codemirror.setValue.apply(this.codemirror, arguments);
  };
  Ninja.prototype.on = function() {
    if (!this.codemirror) return null;
    return this.codemirror.on.apply(this.codemirror, arguments);
  };
  Ninja.prototype.refresh = function() {
    if (!this.codemirror) return null;
    return this.codemirror.refresh();
  };

  /*===============================================
  =            Editor's Static Methods            =
  ===============================================*/  
  
  Ninja.key = addKey;
  Ninja.tool = addTool;
  Ninja.inject = inject; // needs to parse codemirror instance

  /*======================================
  =            Editor's Utils            =
  ======================================*/
  
  /**
  *
  * Toggle whatever you like
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
      var count = 1;
      var gap = endPoint.line - startPoint.line;
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

          if (hasTypeBefore && styleMap[olderTypes[0]])
            text = text.replace(styleMap[olderTypes[0]].re, '$1');

          if (stat[type]) {
            text = text.replace(style.re, '$1');
          } else {
            if (type === 'ordered-list') {
              // count how many line we want to add order.
              if (gap !== 0) {
                text = count + style.prepend + text;
                count ++;
              } else {
                text = 1 + style.prepend + text;
              }
            } else {
              text = style.prepend + text;
            }
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
  * Draw something, and wrap current cursor.
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
        break;
        case 'link':
          ret.link = true;
        break;
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
  function createIcon(item, self) {
    var isNotLink = typeof(item) === 'string';
    var isKen = item.type && item.type === 'ken';
    var name = item.name || item;
    var defaultKeys = createDefaultKeyMap();
    var iconMap = {
      'quote': 'quote-left',
      'ordered-list':'list-ol',
      'unordered-list': 'list',
      'fullscreen': 'expand'
    };

    if (isKen) {
      item = findTool(item.name);
      if (!item) return;
    }

    if (isNotLink) {
      var sep = document.createElement('i');
      sep.className = 'separator';
      return sep;
    }

    var el = document.createElement('a');

    if (defaultKeys[name])
      item.title = defaultKeys[name];

    if (item.title) {
      el.title = item.title;
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

    el.className += item.class || ('fa fa-' + (iconMap[name] || name));

    if (item.action) {
      el.onclick = function(eve) {
        if (typeof(item.action) === 'function')
          return item.action(self, el, eve);
        return;
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
    return findCodesAndAddClass(cm, 'ff-monospace'); // just for test.
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

    var defaultKeyMap = createDefaultKeyMap();
    var keyFunctionMap = createFunctionMap(defaultKeyMap);

    return formatKeys(extendKeys(keyFunctionMap, customKeyMaps));

    function createFunctionMap(obj) {
      var fns = {};
      for (var key in obj) {
        var shortcut = obj[key];
        if (['link','image'].indexOf(key) > -1)
          fns[shortcut] = draw(key);
        else if (['bold', 'italic', 'quote', 'unordered-list', 'ordered-list'].indexOf(key) > -1)
          fns[shortcut] = toggle(key);
        else
          fns[shortcut] = key;
      }
      return fns;
    }

    // TODO: use `copy` instead of &.
    function extendKeys(defaults, customs) {
      if (!customs)
        return defaults;
      for (var key in customs) {
        var tool = findTool(key);
        if (tool)
          defaults[customs[key]] = tool.action; // find the real function
      }
      return defaults;
    }

    function formatKeys(obj) {
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

  function createDefaultKeyMap() {
    return {
      'link': 'Cmd-K',
      'image': 'Cmd-Alt-I',
      'bold': 'Cmd-B',
      'italic': 'Cmd-I',
      'quote': "Cmd-'",
      'unordered-list': 'Cmd-L',
      'ordered-list': 'Cmd-Alt-L',
      'newlineAndIndentContinueMarkdownList': 'Enter'
    }
  }

  /**
  *
  * Init default Toolbar
  *
  * @param {[Obejct]} [customToolbar]
  *
  **/
  function initToolbar(customToolbar, cm) {
    var defaultToolbar = [
      {name: 'bold', action: trigger(toggle, 'bold', cm)},
      {name: 'italic', action: trigger(toggle,'italic', cm)},
      '|',
      {name: 'quote', action: trigger(toggle,'quote', cm)},
      {name: 'unordered-list', action: trigger(toggle, 'unordered-list', cm)},
      {name: 'ordered-list', action: trigger(toggle,'ordered-list', cm)},
      '|',
      {name: 'link', action: trigger(draw,'link', cm)},
      {name: 'image', action: trigger(draw,'image', cm)},
      {name: 'upload', type: 'ken'}, // bind exist addon
      {name: 'fullscreen', action: trigger(toggle,'fullscreen', cm)}
    ];
    return customToolbar || defaultToolbar;

    function trigger(method, type, cm) {
      return function() {
        return method(type)(cm);
      }
    }
  }

  /*=============================================
  =               Directives                    =
  =============================================*/  

  function ninjaDirective($timeout) {
    var directive = {
      restrict: 'AE',
      require: 'ngModel',
      template: '<textarea></textarea>',
      replace: true,
      link: link
    };
    return directive;

    function link(scope, element, attrs, ctrl) {
      if (!element.length)
        return;

      // init editor
      var editor = new Ninja(element[0]);

      // sync data
      editor.on('change', updateModel);
      ctrl.$render();

      window.editor = editor;

      // model => view
      ctrl.$render = function() {
        if (!editor) 
          return;
        editor.setValue(
          ctrl.$isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue
        );
        // refesh content by force
        $timeout(function() {
          editor.refresh();
        }, 0);
      };

      // view => model
      function updateModel() {
        ctrl.$setViewValue(editor.getValue());
      }
    }
  }
})(window.CodeMirror,window.angular);
