(function(Ninja, upyun, angular, jQuery) {
  // if no Ninja lib, diable this ken.
  if (!Ninja)
    return;

  Ninja
    .tool('upload', createButton, upload) // bind upload function when clicked.
    .key('upload','Cmd-Alt-U'); // bind alias to hotkey.

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
    if (!upyun)
      throw new Error('Upload.init(); Upyun lib not found');
    if (!$) 
      throw new Error('Upload.init(); Selector (jQuery/angular.element) not found.');

    var uploading = false;

    if (!document.getElementById(inputId))
      createHiddenInput();

    var input = document.getElementById(inputId);
    input.click();

    $(input).on('change', function(eve) {
      if (uploading) return;
      // lock status
      uploading = true;

      upyun.upload(formName, function(err, response, image) {
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

  function createHiddenInput(element) {
    var input = document.createElement('input');
    input.id = inputId;
    input.type = 'file';
    input.name = 'file';
    input.style.display = 'none';
    $(element).after(input);
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
  window.ninja, 
  window.upyun, 
  window.angular,
  window.jQuery
);
