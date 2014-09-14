![editor-ninja](./editor-ninja.jpg)

## Editor Ninja

a hackable Markdown editor based on [CodeMirror](http://codemirror.net/). 
inspired by lepture's [editor](https://github.com/lepture/editor). 

### Features

- [x] Supports Markdown and GFM
- [x] Flexible and expandable
- [x] Supports Angular.js directive
- [x] Built-in upload addon
- [x] Easy-to-use API

### Installation
```bash
$ bower install ninja --save
```

### Basic Example

#### HTML Part:

```html
<textarea id="editor">
  Texts...
</textarea>
```

#### Javascript Part 

basic useage:

```js
new EditorNinja(document.getElementById('editor'));
```

advanced useage:

```js
var editor = new EditorNinja();

editor
  .tool('custom', bindClick)
  .tool(
    'inject-custom-html', 
    '<span class="style-class">' +
      'customHtml' + 
      '<i class="fa fa-home"></i>' +
    '</span>', 
    bindClick
  )
  .render();

function bindClick(editor) {
  console.log('just clicked!');
  // inject texts
  editor.inject('you have been hacked!');
}
```

### Angular.js Example

#### HTML Part:

```html
<body ng-app="app">
  <div ng-controller="article">
    <editor-ninja ng-model="content"></editor-ninja>
  </div>
</body>
```

```js
angular
  .module('app', ['ninja', 'ninja.upload'])
  .config(['ninjaUploadProvider', function(ninjaUploadProvider) {
    // config upload buckct
    ninjaUploadProvider.config('upyun', {
      bucket: 'xxx',
      form_api_secret: 'xxxxxxx'
    });
  }])
  .controller('article', ['$scope', function($scope){
    $scope.content = 'texts';
  }]);
```

### Contributing
- Fork this repo
- Clone your repo
- Install dependencies
- Checkout a feature branch
- Feel free to add your features
- Make sure your features are fully tested
- Open a pull request, and enjoy <3

### MIT license
Copyright (c) 2014 Hsiaoming Yang, Guo Yu &lt;o.u.turing@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the &quot;Software&quot;), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---
![docor](https://cdn1.iconfinder.com/data/icons/windows8_icons_iconpharm/26/doctor.png)
built upon love by [docor](https://github.com/turingou/docor.git) v0.1.3