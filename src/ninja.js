(function(codeMirror, angular) {
  'use strict';

  if (!codeMirror) throw new Error('codeMirror is required.');

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

  // Editor's prototype functions
  Ninja.prototype.replaceSelection = replaceSelection;
  Ninja.prototype.drawLink = drawLink;
  Ninja.prototype.toggleBold = toggleBold;
  Ninja.prototype.toggleItalic = toggleItalic;

  function toggleBlockquote(editor) {
    var cm = editor.codemirror;
    _toggleLine(cm, 'quote');
  }

  function toggleUnOrderedList(editor) {
    var cm = editor.codemirror;
    _toggleLine(cm, 'unordered-list');
  }

  function toggleOrderedList(editor) {
    var cm = editor.codemirror;
    _toggleLine(cm, 'ordered-list');
  }

  function drawLink(editor) {
    var cm = editor.codemirror;
    var stat = getState(cm);
    replaceSelection(cm, stat.link, '[', '](http://)');
  }

  function drawImage(editor) {
    var cm = editor.codemirror;
    var stat = getState(cm);
    replaceSelection(cm, stat.image, '![', '](http://)');
  }

  function undo(editor) {
    var cm = editor.codemirror;
    cm.undo();
    cm.focus();
  }

  function redo(editor) {
    var cm = editor.codemirror;
    cm.redo();
    cm.focus();
  }

  function toggleLine(cm, name) {
    var stat = getState(cm);
    var startPoint = cm.getCursor('start');
    var endPoint = cm.getCursor('end');
    var repl = {
      quote: /^(\s*)\>\s+/,
      'unordered-list': /^(\s*)(\*|\-|\+)\s+/,
      'ordered-list': /^(\s*)\d+\.\s+/
    };
    var map = {
      quote: '> ',
      'unordered-list': '* ',
      'ordered-list': '1. '
    };
    for (var i = startPoint.line; i <= endPoint.line; i++) {
      (function(i) {
        var text = cm.getLine(i);
        if (stat[name]) {
          text = text.replace(repl[name], '$1');
        } else {
          text = map[name] + text;
        }
        cm.setLine(i, text);
      })(i);
    }
    cm.focus();
  }

  function toggleBold() {
    var cm = this.codemirror;
    var stat = getState(cm);

    var text;
    var start = '**';
    var end = '**';

    var startPoint = cm.getCursor('start');
    var endPoint = cm.getCursor('end');
    if (stat.bold) {
      text = cm.getLine(startPoint.line);
      start = text.slice(0, startPoint.ch);
      end = text.slice(startPoint.ch);

      start = start.replace(/^(.*)?(\*|\_){2}(\S+.*)?$/, '$1$3');
      end = end.replace(/^(.*\S+)?(\*|\_){2}(\s+.*)?$/, '$1$3');
      startPoint.ch -= 2;
      endPoint.ch -= 2;
      cm.setLine(startPoint.line, start + end);
    } else {
      text = cm.getSelection();
      cm.replaceSelection(start + text + end);

      startPoint.ch += 2;
      endPoint.ch += 2;
    }
    cm.setSelection(startPoint, endPoint);
    cm.focus();
  };

  function toggleItalic() {
    var cm = this.codemirror;
    var stat = getState(cm);

    var text;
    var start = '*';
    var end = '*';

    var startPoint = cm.getCursor('start');
    var endPoint = cm.getCursor('end');
    if (stat.italic) {
      text = cm.getLine(startPoint.line);
      start = text.slice(0, startPoint.ch);
      end = text.slice(startPoint.ch);

      start = start.replace(/^(.*)?(\*|\_)(\S+.*)?$/, '$1$3');
      end = end.replace(/^(.*\S+)?(\*|\_)(\s+.*)?$/, '$1$3');
      startPoint.ch -= 1;
      endPoint.ch -= 1;
      cm.setLine(startPoint.line, start + end);
    } else {
      text = cm.getSelection();
      cm.replaceSelection(start + text + end);

      startPoint.ch += 1;
      endPoint.ch += 1;
    }
    cm.setSelection(startPoint, endPoint);
    cm.focus();
  }

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

  // Check if a object is vaild tool object.
  function isTool(obj) {
    return obj && typeof(obj) === 'object' && obj.hasOwnProperty('name') && obj.hasOwnProperty('action');
  }

  // Init default keymaps
  function initKeyMaps(customKeyMaps) {
    var defaultKeyMaps = {
      'Cmd-B': toggleBold,
      'Cmd-I': toggleItalic,
      'Cmd-K': drawLink,
      'Cmd-Alt-I': drawImage,
      "Cmd-'": toggleBlockquote,
      'Cmd-Alt-L': toggleOrderedList,
      'Cmd-L': toggleUnOrderedList,
      'Enter': 'newlineAndIndentContinueMarkdownList'
    };
    return customKeyMaps || defaultKeyMaps;
  }

  // Init default Toolbar
  function initToolbar(customToolbar) {
    var defaultToolbar = [
      {name: 'bold', action: toggleBold},
      {name: 'italic', action: toggleItalic},
      '|',
      {name: 'quote', action: toggleBlockquote},
      {name: 'unordered-list', action: toggleUnOrderedList},
      {name: 'ordered-list', action: toggleOrderedList},
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
