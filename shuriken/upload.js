(function(Ninja, angular, jQuery) {
  if (!Ninja) return;
  var upyunModule;

  Ninja
    // bind upload function when clicked.
    .tool('upload', createButton(), upload)
    // bind alias to hotkey.
    .key('upload', 'Cmd-Alt-U');

  if (angular) {
    if (!angular.module('upyun'))
      throw new Error('EditorNinjaUpload.init(); Upyun lib not found');

    angular
      .module('EditorNinja.upload', ['upyun'])
      .provider('EditorNinjaUpload', ['upyunProvider', function(upyunProvider) {
        var typeMap = {
          upyun: upyunProvider
        };
        this.config = function(type, configs) {
          if (!typeMap[type]) return;
          typeMap[type].config(configs);
        };
        this.$get = function() {};
      }])
      .run(['upyun', function(upyun){
        upyunModule = upyun;
      }])
  }

  var $;
  var inputId = 'imageUpload';
  var formName = 'imageUploadForm';

  if (angular)
    $ = angular.element;  
  if (jQuery)
    $ = jQuery;

  // this `editor` is a editor instance (when click)
  // or a `codemirror` instance (when press hotkey)
  function upload(editor) {
    if (!$) 
      throw new Error('Upload.init(); Selector (jQuery/angular.element) not found.');

    var upyun = window.upyun || upyunModule;
    var uploading = false;

    if (!upyun)
      throw new Error('Upload.init(); ninja.upload configs missing');

    if (!document.getElementById(inputId))
      createHiddenInput();

    var input = document.getElementById(inputId);
    input.click();

    $(input).on('change', function(eve) {
      if (uploading) return;
      // lock status
      uploading = true;

      upyun.upload(
        formName, 
        function(err, response, image) {
        // unlock status
        uploading = false;

        if (err) 
          return errorhandler(err);
        if (!(image.code === 200 && image.message === 'ok')) 
          return errorhandler(image);

        // inject abs uri to current cursor
        // TODO: remove this ugly hack.
        if (editor.inject)
          editor.inject('![', '](' + image.absUrl + ')');
        else
          Ninja.inject(editor, '![', '](' + image.absUrl + ')');
      });
    });

    return false;
  }

  function createHiddenInput() {
    var form = document.createElement('form');
    var input = document.createElement('input');
    form.id = formName;
    form.name = formName;
    input.id = inputId;
    input.type = 'file';
    input.name = 'file';
    input.style.display = 'none';
    form.appendChild(input);
    document.body.appendChild(form);
  }

  function errorhandler(err) {
    window.alert('上传失败，请稍后再试...');
    if (err)
      console.error(err);
    return err;
  }

  function createButton() {
    return [
      '<span class="fa fa-cloud-upload">',
      '</span>'
    ].join('');
  }

})(
  window.EditorNinja, 
  window.angular,
  window.jQuery
);
