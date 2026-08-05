from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'user', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')