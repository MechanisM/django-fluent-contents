from django.conf import settings
from django.utils.translation import ugettext_lazy as _
from fluent_contents.extensions import ContentPlugin, plugin_pool
from fluent_contents.plugins.disquswidgets.models import DisqusCommentsAreaItem


class DisqusCommentsPlugin(ContentPlugin):
    model = DisqusCommentsAreaItem
    category = _('Interactivity')
    render_template = "fluent_contents/plugins/disquswidgets/comments.html"


    def get_context(self, request, instance, **kwargs):
        parent_url = instance.parent.get_absolute_url()
        return {
            'instance': instance,
            'DISQUS_WEBSITE_SHORTNAME': settings.DISQUS_WEBSITE_SHORTNAME,  # for convenience, pass setting

            # Template config setters are hard to use, provide context here!
            'disqus_identifier': parent_url.strip('/'),  # URL is expected to be relative.
            'disqus_url': parent_url,
            'disqus_developer': 0,
            #disqus_title
        }


plugin_pool.register(DisqusCommentsPlugin)
