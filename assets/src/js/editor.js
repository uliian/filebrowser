$(document).on('page:editor', function() {
  var mode = $("#editor-source").data('mode');
  var aceEditor = ace.edit("editor-source");
  aceEditor.getSession().setMode("ace/mode/" + mode);
  aceEditor.setOptions({
    wrap: true,
    maxLines: Infinity,
    theme: "ace/theme/github",
    showPrintMargin: false,
    fontSize: "1em"
  });

  $('body').off('keypress', 'input').on('keypress', 'input', function(event) {
    if (event.keyCode == 13) {
      event.preventDefault();
      $('input[value="Save"]').focus().click();
      return false;
    }
  });

  $('#site-title').keyup(function() {
    $('.frontmatter #title').val($(this).val());
  });

  // Toggles between preview and editing mode
  $("#see-preview").off('click').click(function(event) {
    var preview = $('#editor-preview');
    var editor = $('pre.ace_editor');

    event.preventDefault();

    // If it currently in the preview mode, hide the preview
    // and show the editor
    if ($(this).data("previewing") == "true") {
      preview.hide();
      editor.fadeIn();
      $(this).data("previewing", "false");
      notification({
        text: "Think, relax and do the better you can!",
        type: 'information',
        timeout: 2000
      });
    } else {
      // If it's in editing mode, convert the markdown to html
      // and show it
      var converter = new showdown.Converter(),
        text = aceEditor.getValue(),
        html = converter.makeHtml(text);

      // Hide the editor and show the preview
      editor.hide();
      preview.html(html).fadeIn();

      $(this).data("previewing", "true");
      notification({
        text: "This is how your post looks like.",
        type: 'information',
        timeout: 2000
      });
    }

    return false;
  });

  //TODO: reform this
  // Submites any form in the page in JSON format
  $('form').submit(function(event) {
    event.preventDefault();

    // Reset preview area and button to make sure it will
    // not serialize any form inside the preview
    $('#preview-area').html('').fadeOut();
    $('#preview').data("previewing", "false");
    $('.CodeMirror').fadeIn();

    // Save editor values
    if (typeof editor !== 'undefined' && editor) {
      editor.save();
    }

    var data = JSON.stringify($(this).serializeJSON()),
      button = $(this).find("input[type=submit]:focus");

    $.ajax({
      type: 'POST',
      url: window.location,
      data: data,
      headers: {
        'X-Regenerate': button.data("regenerate"),
        'X-Schedule': button.data("schedule"),
        'X-Content-Type': button.data("type")
      },
      dataType: 'json',
      encode: true,
      contentType: "application/json; charset=utf-8",
    }).done(function(data) {
      notification({
        text: button.data("message"),
        type: 'success',
        timeout: 5000
      });
    }).fail(function(data) {
      notification({
        text: 'Something went wrong.',
        type: 'error'
      });
      console.log(data);
    });

    return false;
  });

  // Adds one more field to the current group
  $("body").on('click', '.add', function(event) {
    event.preventDefault();
    defaultID = "lorem-ipsum-sin-dolor-amet";

    if ($("#" + defaultID).length) {
      return false;
    }

    block = $(this).parent().parent();
    blockType = block.data("type");
    blockID = block.attr("id");

    // Main add button, after all blocks
    if (block.is('div') && block.hasClass("frontmatter")) {
      block = $('.blocks');
      block.append('<div class="block" id="' + defaultID + '"></div>');
      blockType = "object";
    }

    // If the Block Type is an array
    if (blockType == "array") {
      newID = blockID + "[]";
      input = blockID;
      input = input.replace(/\[/, '\\[');
      input = input.replace(/\]/, '\\]');
      block.append('<div id="' + newID + '-' + $('#' + input + ' > div').length + '" data-type="array-item"><input name="' + newID + ':auto" id="' + newID + '"></input><span class="actions"> <button class="delete">&#8722;</button></span></div></div>');
    }

    // If the Block is an object
    if (blockType == "object") {
      newItem = $("#" + defaultID);
      newItem.html('<input id="name-' + defaultID + '" placeholder="Write the field name and press enter..."></input>');
      field = $("#name-" + defaultID);

      // Show a notification with some information for newbies
      if (!document.cookie.replace(/(?:(?:^|.*;\s*)placeholdertip\s*\=\s*([^;]*).*$)|^.*$/, "$1")) {
        var date = new Date();
        date.setDate(date.getDate() + 365);
        document.cookie = 'placeholdertip=true; expires=' + date.toUTCString + '; path=/';

        notification({
          text: 'Write the field name and then press enter. If you want to create an array or an object, end the name with ":array" or ":object".',
          type: 'information'
        });
      }

      $(field).keypress(function(event) {
        // When you press enter within the new name field:
        if (event.which == 13) {
          event.preventDefault();
          // This var should have a value of the type "name[:array, :object]"
          value = field.val();

          if (value == "") {
            newItem.remove();
            return false;
          }

          elements = value.split(":")

          if (elements.length > 2) {
            notification({
              text: "Invalid syntax. It must be 'name[:type]'.",
              type: 'error'
            });
            return false;
          }

          if (elements.length == 2 && elements[1] != "array" && elements[1] != "object") {
            notification({
              text: "Only arrays and objects are allowed.",
              type: 'error'
            });
            return false;
          }

          field.remove();

          // TODO: continue here. :) 04/02/2016

          if (typeof blockID === "undefined") {
            blockID = elements[0];
          } else {
            blockID = blockID + '[' + elements[0] + ']';
          }

          if (elements.length == 1) {
            newItem.attr('id', 'block-' + blockID);
            newItem.append('<input name="' + blockID + ':auto" id="' + blockID + '"></input><br>');
            newItem.prepend('<label for="' + blockID + '">' + value + '</label> <span class="actions"><button class="delete">&#8722;</button></span>');
          } else {
            type = "";

            if (elements[1] == "array") {
              type = "array";
            } else {
              type = "object"
            }

            template = "<fieldset id=\"${blockID}\" data-type=\"${type}\"> <h3>${elements[0]}</h3> <span class=\"actions\"> <button class=\"add\">&#43;</button> <button class=\"delete\">&#8722;</button> </span> </fieldset>"
            template = template.replace("${blockID}", blockID);
            template = template.replace("${elements[0]}", elements[0]);
            template = template.replace("${type}", type);
            newItem.after(template);
            newItem.remove();

            console.log('"' + blockID + '" block of type "' + type + '" added.');
          }

          return false;
        }
      });
    }

    return false;
  });

  $("body").on('click', '.delete', function(event) {
    event.preventDefault();
    button = $(this);

    name = button.parent().parent().attr("for") || button.parent().parent().attr("id") || button.parent().parent().parent().attr("id");
    name = name.replace(/\[/, '\\[');
    name = name.replace(/\]/, '\\]');
    console.log(name)

    $('label[for="' + name + '"]').fadeOut().remove();
    $('#' + name).fadeOut().remove();

    return false;
  });
});