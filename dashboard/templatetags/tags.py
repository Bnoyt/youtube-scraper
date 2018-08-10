from django import template

register = template.Library()



@register.filter(name='get_percent_abs')
def get_percent_abs(float1,float2):
	return 100.0*float(float1)/(float(float2)+0.0)