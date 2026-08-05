from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services.mcda import analyze_location
from .services.weights import INDUSTRY_WEIGHTS

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recommend(request):
    lat = request.data.get('lat')
    lon = request.data.get('lon')
    if lat is None or lon is None:
        return Response({'error': 'lat and lon required'}, status=400)

    results = []
    for industry in INDUSTRY_WEIGHTS.keys():
        result = analyze_location(float(lat), float(lon), industry)
        results.append({
            'industry': industry,
            'score': result['final_score'],
            'risks': result['risks']
        })
    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return Response(results)