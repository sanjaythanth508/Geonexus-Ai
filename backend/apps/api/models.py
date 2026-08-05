from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.gis.db import models as gis_models


User = get_user_model()

class Road(models.Model):
    geometry = gis_models.GeometryField(srid=4326)
    name = models.CharField(max_length=255, blank=True, null=True)
    # Add other fields if needed (osm_id, fclass, etc.)

    class Meta:
        db_table = 'roads'
        managed = False   # prevent Django from creating/modifying the table

class Railway(models.Model):
    geometry = gis_models.GeometryField(srid=4326)
    name = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'railways'
        managed = False



class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    




# Add similar models for:
# - Airport
# - Port
# - GIDC (industrial zones)
# - Hospital
# - Warehouse
# - ProtectedArea
# - Substation
# - TransmissionLine
# - GasPipeline
# - Waterbody

# Example for a point layer (Airport):
class Airport(models.Model):
    geom = models.JSONField(blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'airports'
        indexes = [models.Index(fields=['name'])]

    def __str__(self):
        return self.name or f"Airport {self.id}"