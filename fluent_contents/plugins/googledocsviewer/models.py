from django.db import models
from django.utils.translation import ugettext_lazy as _
from fluent_contents.models import ContentItem
from fluent_contents.utils import validate_html_size


class GoogleDocsViewerItem(ContentItem):
    """
    A Google Docs viewer that is displayed at the page.
    """
    url = models.URLField(_("File URL"), help_text=_("Specify the URL of an online document, for example a PDF or DOCX file."))
    width = models.CharField(_("Width"), max_length=10, validators=[validate_html_size], default="100%", help_text=_("Specify the size in pixels, or a percentage of the container area size."))
    height = models.CharField(_("Height"), max_length=10, validators=[validate_html_size], default="600", help_text=_("Specify the size in pixels."))

    class Meta:
        verbose_name = _("Google Docs viewer")
        verbose_name_plural = _("Google Docs viewers")

    def __unicode__(self):
        return self.url
