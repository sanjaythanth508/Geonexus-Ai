import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .serializers import AnalysisRequestSerializer, AnalysisRunSerializer
from .services.scorer import score_and_save
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes

from apps.analysis.services.scorer import run_and_save_analysis
from apps.analysis.ml import config as ML_CONFIG



class ScoreLocationView(APIView):
    """POST /api/analysis/score/  {"lat": ..., "lon": ..., "industry": "..."}"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    # NOTE: AllowAny + empty authentication_classes means this endpoint is
    # fully public and bypasses Django's session-based CSRF check, which
    # would otherwise reject POST requests coming from React. Once you add
    # real user accounts, switch this to JWT authentication instead of
    # opening it up — do not leave a production endpoint unauthenticated
    # if it becomes billable/rate-limited later.
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        req = AnalysisRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)

        try:
            run = score_and_save(
                lat=req.validated_data["lat"],
                lon=req.validated_data["lon"],
                industry=req.validated_data["industry"],
                user=request.user if request.user.is_authenticated else None,
            )
        except FileNotFoundError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(AnalysisRunSerializer(run).data, status=status.HTTP_201_CREATED)
    
class PredictRequestSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    industry_type = serializers.CharField()

    def validate_industry_type(self, value):
        from apps.analysis.ml.predictor import get_predictor
        try:
            predictor = get_predictor()
            known = predictor._list_known_industries()
        except Exception:
            known = list(ML_CONFIG.INDUSTRY_TYPE_KEYWORDS.keys())
        if value not in known:
            raise serializers.ValidationError(
                f"Unknown industry_type. Known: {known}"
            )
        return value


class AnalysisRunSerializer(serializers.ModelSerializer):
    industry_type = serializers.CharField(source="industry", read_only=True)

    class Meta:
        from apps.analysis.models import AnalysisRun
        model = AnalysisRun
        fields = "__all__"


@api_view(["POST"])
@permission_classes([AllowAny])
def predict_site(request):
    req = PredictRequestSerializer(data=request.data)
    req.is_valid(raise_exception=True)

    try:
        run = run_and_save_analysis(
            user=request.user if request.user.is_authenticated else None,
            latitude=req.validated_data["latitude"],
            longitude=req.validated_data["longitude"],
            industry_type=req.validated_data["industry_type"],
        )
    except FileNotFoundError as e:
        # model/data artifacts not deployed yet
        return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(AnalysisRunSerializer(run).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def list_industry_types(request):
    try:
        with open(ML_CONFIG.TUNED_WEIGHTS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        industry_types = []

        # Read industries from "priors"
        if isinstance(data.get("priors"), dict):
            industry_types.extend(data["priors"].keys())

        # Read industries from "tuned"
        if isinstance(data.get("tuned"), dict):
            industry_types.extend(data["tuned"].keys())

        # Remove duplicates and sort
        industry_types = sorted(set(industry_types))

        return Response(
            {
                "industry_types": industry_types
            },
            status=status.HTTP_200_OK
        )

    except FileNotFoundError:
        return Response(
            {
                "error": "Industry configuration file not found.",
                "industry_types": []
            },
            status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        return Response(
            {
                "error": str(e),
                "industry_types": []
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )