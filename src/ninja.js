(function(codeMirror, angular) {
  'use strict';

  if (!codeMirror) 
    throw new Error('Ninja.init(); CodeMirror is required.');

  // bootstrap main function
  (function(fn) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      module.exports = fn;
    else if (typeof define == "function" && define.amd) // AMD
      return define([], fn);
    else if (angular) // Angular.js
      angular
        .module('ninja', ['upyun'])
        .service('ninja', ninja)
        .directive('ninja', ['$upyun', '$timeout', ninjaDirective]);
    else
      window.ninja = fn;
  })(Ninja);

  // Editor Ninja
  function Ninja(el, options) {
    if (!el && !options)
      return this;
    this.element = el;
    this.options = options || {};
    if (this.element)
      return this.render();
  }

  // Set a key-value pair to instance
  Ninja.prototype.set = function set(key, value) {
    if (key && value)
      this[key] = value;
    return this;
  };

  // Set a key-value pair to instance.keyMap
  Ninja.prototype.setKey = function setKey(key, value) {
    if (!this.keyMaps)
      this.keyMaps = {};
    if (key && value)
      this.keyMaps[key] = value;
    return this;
  };

  // Add toolbar button
  Ninja.prototype.addTool = function addTool(name, action) {
    if (!this.toolbar)
      this.toolbar = [];
    if (name && action)
      this.toolbar.push(tool);
    return this;
  };

  // Render real editor
  Ninja.prototype.render = function render() {
    var ele = this.element || document.getElementsByTagName('textarea')[0];

    if (this.codemirror) 
      delete this.codemirror;
    if (!ele) 
      throw new Error('ninja.render(); ninja requires a vaild element to render');

    var codeMirrorOptions = {};
    codeMirrorOptions.mode = 'markdown';
    codeMirrorOptions.theme = 'zen';
    codeMirrorOptions.lineNumbers = false;
    codeMirrorOptions.lineWrapping = true;
    codeMirrorOptions.extraKeys = initKeyMaps(this.keyMaps);

    if (ele.value !== '') 
      codeMirrorOptions.value = element.value;

    this.codemirror = new codeMirror.fromTextArea(ele, codeMirrorOptions);
  };

  // Create a status bar on bottom of the editor
  // TODO: custom status bar prefix
  Editor.prototype.createStatusbar = function(status) {
    status = status || this.options.status;

    if (!status || status.length === 0) return;

    var bar = document.createElement('div');
    bar.className = 'editor-statusbar';

    var pos, cm = this.codemirror;
    for (var i = 0; i < status.length; i++) {
      (function(name) {
        var el = document.createElement('span');
        el.className = name;
        if (name === 'words') {
          el.innerHTML = '0';
          cm.on('update', function() {
            el.innerHTML = wordCount(cm.getValue());
          });
        } else if (name === 'lines') {
          el.innerHTML = '0';
          cm.on('update', function() {
            el.innerHTML = cm.lineCount();
          });
        } else if (name === 'cursor') {
          el.innerHTML = '0:0';
          cm.on('cursorActivity', function() {
            pos = cm.getCursor();
            el.innerHTML = pos.line + ':' + pos.ch;
          });
        }
        bar.appendChild(el);
      })(status[i]);
    }
    var cmWrapper = this.codemirror.getWrapperElement();
    cmWrapper.parentNode.insertBefore(bar, cmWrapper.nextSibling);
    return bar;
  };

  // Editor's prototype functions
  Editor.prototype.toggle = function(type) {
    return toggle(type, this);
  }
  Editor.prototype.toggleBold = function() {
    toggleBold(this);
  };
  Editor.prototype.toggleItalic = function() {
    toggleItalic(this);
  };
  Editor.prototype.drawLink = function() {
    drawLink(this);
  };
  Editor.prototype.drawImage = function() {
    drawImage(this);
  };
  Editor.prototype.undo = function() {
    undo(this);
  };
  Editor.prototype.redo = function() {
    redo(this);
  };
  Editor.prototype.toggleFullScreen = function() {
    toggleFullScreen(this);
  };
  Editor.prototype.replaceSelection = replaceSelection;
  Editor.prototype.getState = getState;

  /*======================================
  =            Editor's Utils            =
  ======================================*/
  
  /**
  *
  * Toggle Whatever you like
  * 
  * @example
  *   toggle('bold');
  *   toggle('italic');
  *   toggle('quote');
  *   toggle('unordered-list');
  *   toggle('ordered-list');
  *
  **/
  function toggle(type, self) {
    return toggleWhatever;

    var toggleTextList = ['bold', 'italic'];
    
    function toggleWhatever(editor) {
      // bootstrap to codemirror instance.
      var cm = self && self.codemirror ? 
               self.codemirror : 
               editor.codemirror;
      if (!cm) 
        return false;
      if (toggleTextList.indexOf(type) > -1)
        return toggleText(type)(cm);

      return toggleBlock(cm, type);
    }

    /**
    *
    * Toggle a line to selected block style
    *
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
        quote: {
          re: /^(\s*)\>\s+/,
          prepend: '> '
        },
        'unordered-list': {
          re: /^(\s*)(\*|\-|\+)\s+/,
          prepend: '* '
        },
        'ordered-list': {
          re: /^(\s*)\d+\.\s+/,
          prepend: '1. '
        }
      };
      var style = styleMap[type];
      for (var i = startPoint.line; i <= endPoint.line; i++) {
        (function(i) {
          var text = cm.getLine(i);
          if (stat[type])
            text = text.replace(style.re[type], '$1');
          else
            text = style.prepend[type] + text;
          cm.setLine(i, text);
        })(i);
      }
      cm.focus();
    }

    /**
    *
    * Toggle a wrappered text to seleced style.
    * 
    * @example
    *   toggleText('bold') => fn(cm);
    *   toggleText('italic') => fn(cm);
    *
    **/
    function toggleText(type) {
      return toggleTextByStyle;

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
          cm.setLine(startPoint.line, start + end);
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
    * Toggle a preview mode
    * @status: [disabled]
    * @todo [enable after rewriting...]
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
    return drawWhatever;

    var typeMap = {
      link: ['[', '](http://)'],
      image: ['![', '](http://)']
    };

    function drawWhatever(editor) {
      var cm = editor.codemirror;
      var stat = getState(cm);
      replaceSelection(cm, stat[type], typeMap[type][0], typeMap[type][1])
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

    function triggerBuiltinMethod(editor) {
      var cm = editor.codemirror;
      if (!cm[type]) return;
      cm[type]();
      cm.focus();
    }
  }

  function replaceSelection(cm, active, start, end) {
    var text;
    var startPoint = cm.getCursor('start');
    var endPoint = cm.getCursor('end');
    if (active) {
      text = cm.getLine(startPoint.line);
      start = text.slice(0, startPoint.ch);
      end = text.slice(startPoint.ch);
      cm.setLine(startPoint.line, start + end);
    } else {
      text = cm.getSelection();
      cm.replaceSelection(start + text + end);

      startPoint.ch += start.length;
      endPoint.ch += start.length;
    }
    cm.setSelection(startPoint, endPoint);
    cm.focus();
  }

  /*-----  End of Editor's Utils  ------*/

  // Init default keymaps
  function initKeyMaps(customKeyMaps) {
    var defaultKeyMaps = {
      'Cmd-B': toggleBold,
      'Cmd-I': toggleItalic,
      'Cmd-K': drawLink,
      'Cmd-Alt-I': drawImage,
      "Cmd-'": toggle('quote', editor),
      'Cmd-Alt-L': toggleOrderedList,
      'Cmd-L': toggle('unordered-list', editor),
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
      function format(name) {
        if (isMac)
          name = name.replace('Ctrl', 'Cmd');
        else
          name = name.replace('Cmd', 'Ctrl');
        return name;
      }
    }
  }

  // Init default Toolbar
  function initToolbar(customToolbar) {
    var defaultToolbar = [
      {name: 'bold', action: toggleBold},
      {name: 'italic', action: toggleItalic},
      '|',
      {name: 'quote', action: toggle('quote')},
      {name: 'unordered-list', action: toggle('unordered-list')},
      {name: 'ordered-list', action: toggle('ordered-list')},
      '|',
      {name: 'link', action: drawLink},
      {name: 'image', action: drawImage},
      {name: 'uploadImage', action: uploadImage},
      '|',
      {name: 'preview', action: togglePreview},
      {name: 'fullscreen', action: toggleFullScreen}
    ];
    return customToolbar || defaultToolbar;
  }

  function ninjaDirective($upyun, $timeout) {
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
})(
  window.CodeMirror,
  window.angular
);
