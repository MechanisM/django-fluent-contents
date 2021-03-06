from django.contrib import admin
from fluent_contents import extensions
from fluent_contents.admin.placeholdereditor import PlaceholderEditorInline, PlaceholderEditorAdmin
from fluent_contents.models import PlaceholderData
from fluent_contents.models.fields import PlaceholderField


class PlaceholderFieldInline(PlaceholderEditorInline):
    """
    The inline used to process placeholder fields.
    """
    template = "admin/fluent_contents/placeholderfield/inline_init.html"


class PlaceholderFieldAdmin(PlaceholderEditorAdmin):
    """
    The base functionality for ``ModelAdmin`` dialogs to display placeholder fields.

    This class loads the :class:`~fluent_contents.models.ContentItem` inlines,
    and initializes the frontend editor for the :class:`~fluent_contents.models.PlaceholderField`.
    """
    placeholder_inline = PlaceholderFieldInline


    def get_placeholder_data(self, request, obj):
        """
        Return the data of the placeholder fields.
        """
        # Return all placeholder fields in the model.
        if not hasattr(self.model._meta, 'placeholder_fields'):
            return []

        data = []
        for name, field in self.model._meta.placeholder_fields.iteritems():
            assert isinstance(field, PlaceholderField)
            data.append(PlaceholderData(
                slot=field.slot,
                title=field.verbose_name.capitalize(),
            ))

        return data


    def get_all_allowed_plugins(self):
        """
        Return which plugins are allowed by the placeholder fields.
        """
        # Get all allowed plugins of the various placeholders together.
        if not hasattr(self.model._meta, 'placeholder_fields'):
            # No placeholder fields in the model, no need for inlines.
            return []

        plugins = []
        for name, field in self.model._meta.placeholder_fields.iteritems():
            assert isinstance(field, PlaceholderField)
            if field.plugins is None:
                # no limitations, so all is allowed
                return extensions.plugin_pool.get_plugins()
            else:
                plugins += field.plugins

        return list(set(plugins))
