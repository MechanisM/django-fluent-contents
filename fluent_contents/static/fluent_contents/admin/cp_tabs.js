/**
 * A Tab interface to organize Placeholder panes.
 */
var cp_tabs = {};

(function($)
{

  // Cached DOM objects
  var empty_tab_title = null;
  var empty_tab = null;
  var placeholder_group_prefix = null;
  var placeholder_id_prefix = null;

  // Allow debugging
  var stub = function() {};
  var console = window.console || {'log': stub, 'error': stub, 'warn': stub};


  cp_tabs.init = function()
  {
    // Get the tab templates
    empty_tab_title = $("#cp-tabnav-template");
    empty_tab       = $("#tab-template");

    // Bind events
    $("#cp-tabnav a").mousedown( cp_tabs.onTabMouseDown ).click( cp_tabs.onTabClick );

    var placeholder_editor_inline = $(".inline-placeholder-group");
    placeholder_group_prefix = placeholder_editor_inline.attr('id').replace(/-group$/, '');
    placeholder_id_prefix = 'id_' + placeholder_group_prefix;   // HACK: assume id_%s as auto_id.
  }


  /**
   * Get a fallback tab to store an orphaned item.
   */
  cp_tabs.get_fallback_pane = function(role, last_known_nr)
  {
    $("#cp-tabnav-orphaned").css("display", "inline");
    return cp_data.get_object_for_pane($("#tab-orphaned"));
  }


  /**
   * Hide the tab to display an orphaned item.
   */
  cp_tabs.hide_fallback_pane = function()
  {
    $("#cp-tabnav-orphaned").hide();
    $("#tab-orphaned").hide();
    cp_tabs._ensure_active_tab();
  }


  /**
   * Rearrange all tabs due to the newly loaded layout.
   *
   * layout = {placeholders: [{key, title}, ..]}
   */
  cp_tabs.load_layout = function(layout)
  {
    // Hide loading
    var loading_tab = $("#cp-tabnav-loading").hide();
    var tabnav  = $("#cp-tabnav");
    var tabmain = $("#cp-tabmain");

    // Deal with invalid layouts
    if( layout == null )
    {
      alert("Error: no layout information available!");
      return;
    }

    // Cache globally
    console.log("Received placeholders: ", layout.placeholders, "dom_regions=", cp_data.dom_placeholders );
    var dbplaceholders = cp_data.get_initial_placeholders();
    var oldplaceholders = cp_data.get_placeholders();
    var newplaceholders = layout.placeholders;
    var placeholders = [];

    // Create map of old IDs
    var dbplaceholderids = {};
    for( var i = 0, len = dbplaceholders.length; i < len; i++ )
      dbplaceholderids[dbplaceholders[i].slot] = dbplaceholders[i].id;

    // Create the appropriate tabs for the regions.
    var id_index  = 0;                           // Items with ID's must be the first items.
    var new_index = newplaceholders.length - 1;  // Unknown how many ID's are reused, start at end.
    for( i = 0, len = newplaceholders.length; i < len; i++ )
    {
      var placeholder = newplaceholders[i];
      var placeholder_id = dbplaceholderids[placeholder.slot] || '';

      // Prepare data for administration
      // Reuse old ID's when possible.
      placeholder.domnode = "tab-region-" + placeholder.slot;
      placeholder.role = placeholder.role || 'm';
      placeholder.id = placeholder_id;
      placeholders.push(placeholder);

      // Create DOM nodes
      loading_tab.before( cp_tabs._create_tab_title(placeholder) );
      tabmain.append( cp_tabs._create_tab_content(placeholder, ( placeholder_id ? id_index : new_index )) );

      if( placeholder_id )
        id_index++;
      else
        new_index--;
    }

    // Update administration


    // Rebind event
    var tab_links = $("#cp-tabnav > li.cp-region > a");
    tab_links.mousedown( cp_tabs.onTabMouseDown ).click( cp_tabs.onTabClick );

    // Migrate formset items.
    cp_data.set_placeholders( placeholders );
    cp_plugins.move_items_to_placeholders();

    // Cleanup. The previous old tabs can be removed now.
    cp_tabs._update_placeholder_forms();
    cp_tabs._remove_old_tabs();
    cp_tabs._ensure_active_tab();
    cp_tabs._restore_tabmain_height();

    // Show tabbar if still hidden (at first load)
    cp_tabs.show();
  }


  cp_tabs._create_tab_title = function(placeholder)
  {
    // The 'cp-region' class is not part of the template, to avoid matching the actual tabs.
    var tabtitle = empty_tab_title.clone().removeAttr("id").addClass("cp-region").show();
    tabtitle.find("a").attr("href", '#' + placeholder.domnode).text(placeholder.title);
    return tabtitle;
  }


  cp_tabs._create_tab_content = function(placeholder, new_index)
  {
    // The 'cp-region-tab' class is not part of the template, but added here to avoid matching the actual tabs earlier on.
    var tab = empty_tab.clone().attr("id", placeholder.domnode).addClass("cp-region-tab");
    tab.find(".cp-plugin-add-button").attr({
        'data-placeholder-id': placeholder.id,
        'data-placeholder-slot': placeholder.slot
    });

    // Set placeholder form fields (id, slot, name, title) from placeholder object.
    var inputs = tab.children('input[name*=__prefix__]');
    for( var i = 0; i < inputs.length; i++ )
    {
      var name = inputs[i].name;
      var fieldname = name.substring(name.lastIndexOf('-') + 1);

      if( fieldname == 'id' && ! placeholder.id)
        inputs.eq(i).removeAttr('value');
      else
        inputs[i].value = placeholder[fieldname];
    }

    // TODO: this is tricky, temporary there will be two elements with the same ID.
    var name_prefix = inputs.filter('[name$=-__prefix__-id]').attr('name').replace(/-__prefix__-id/, '');
    cp_admin.renumber_formset_item(tab, name_prefix, new_index);
    return tab;
  }


  cp_tabs.get_container = function()
  {
    return $(".inline-placeholder-group");
  }


  cp_tabs.show = function(slow)
  {
    if( slow )
      $(".inline-placeholder-group").slideDown();
    else
      $(".inline-placeholder-group").show();
  }


  cp_tabs.hide = function(slow)
  {
    if( slow )
      $(".inline-placeholder-group").slideUp();
    else
      $(".inline-placeholder-group").hide();
  }


  cp_tabs.expire_all_tabs = function()
  {
    // Replace tab titles with loading sign.
    // Must avoid copying the template tab too (this is another guard against it).
    $("#cp-tabnav-loading").show();
    $("#cp-tabnav-orphaned").hide();
    $("#cp-tabnav > li.cp-region:not(#cp-tabnav-template)").remove();

    // set fixed height to avoid scrollbar/footer flashing.
    var tabmain = $("#cp-tabmain");
    var height = tabmain.height();
    if( height )
    {
      tabmain.css("height", height + "px");
    }

    // Hide and mark as old.
    var all_tabs = tabmain.children(".cp-region-tab:not(#tab-template)");
    all_tabs.removeClass("cp-region-tab").addClass("cp-oldtab").removeAttr("id").hide();
  }


  cp_tabs.is_expired_tab = function(node)
  {
    return node.closest('.cp-tab').hasClass('cp-oldtab');
  }


  cp_tabs._ensure_active_tab = function()
  {
    // Activate the fallback item (first) if none active.
    // This needs to happen after organize, so orphans tab might be visible
    var tabnav = $("#cp-tabnav");
    if( tabnav.children("li.active:visible").length == 0 )
      tabnav.children("li.cp-region > a:first").mousedown().mouseup().click();
  }


  cp_tabs._update_placeholder_forms = function()
  {
    // Remove old placeholders
    var tabmain = $("#cp-tabmain");
    var dbamount = parseInt($("#" + placeholder_id_prefix + "-INITIAL_FORMS").val());

    // Build an index of new placeholder IDs
    var dbplaceholders = cp_data.get_initial_placeholders();
    var newplaceholders = cp_data.get_placeholders();
    var reused_ids = {};
    for( var i = 0; i < newplaceholders.length; i++)
    {
      if( newplaceholders[i].id )
        reused_ids[newplaceholders[i].id] = true;
    }

    var newamount = newplaceholders.length;
    if( tabmain.children('.cp-region-tab').length != newamount )
      console.warn("_update_placeholder_forms() - newamount != tabs.length");

    // Old placeholder ID's are reused.
    // Remove the ones which are no longer available.
    tabmain.children('.cp-placeholder-delete, .cp-placeholder-delete').remove();
    for( var i = 0; i < dbplaceholders.length; i++ )
    {
      var id = dbplaceholders[i].id;
      if( !reused_ids[id] )
      {
        var name = placeholder_group_prefix + '-' + newamount++;
        tabmain.prepend(
            '<input type="checkbox" class="cp-placeholder-delete" name="' + name + '-DELETE" checked="checked" />' +
                '<input type="hidden" class="cp-placeholder-delete" name="' + name + '-id" value="' + id + '" />'
        );
      }
    }

    // Total forms should also incorporate deleted records, so always be >= dbamount
    $("#" + placeholder_id_prefix + "-TOTAL_FORMS").val(Math.max(newamount, dbamount));
  }


  cp_tabs._remove_old_tabs = function()
  {
    $("#cp-tabmain > .cp-oldtab").remove();

    // Remove empty/obsolete dom regions
    cp_data.cleanup_empty_placeholders();
  }


  cp_tabs._restore_tabmain_height = function()
  {
    // When the tab height is fixated (during hiding), restore that
    // after children height recalculations / wysiwyg initialisation have happened.
    setTimeout( function() { $("#cp-tabmain").css("height", ''); }, 100 );
  }


  // -------- Basic tab events ------

  /**
   * Tab button click
   */
  cp_tabs.onTabMouseDown = function(event)
  {
    var thisnav = $(event.target).parent("li");
    cp_tabs.enable_tab(thisnav);
  }


  cp_tabs.onTabClick = function(event)
  {
    // Prevent navigating to the href.
    event.preventDefault();
  }


  cp_tabs.enable_tab = function(thisnav)
  {
    var nav   = $("#cp-tabnav li");
    var panes = $("#cp-tabmain .cp-tab");

    // Find new pane to activate
    var href  = thisnav.find("a").attr('href');
    var active = href.substring( href.indexOf("#") );
    var activePane = panes.filter("#" + active);

    // And switch
    panes.hide();
    activePane.show();
    nav.removeClass("active");
    thisnav.addClass("active");

    cp_tabs._focus_first_input(activePane);
  }


  cp_tabs._focus_first_input = function(root)
  {
    // Auto focus on first editor.
    // This can either be an iframe (WYSIWYG editor), or normal input field.
    var firstField = root.find(".yui-editor-editable-container:first > iframe, .form-row :input:first").eq(0);
    firstField.focus();
  }


})(window.jQuery || django.jQuery);
