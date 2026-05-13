package com.tims.mapper;
import com.tims.dto.response.TankFleetSummaryResponse;
import com.tims.dto.response.TankResponse;
import com.tims.entity.Tank;
import com.tims.entity.view.VwTankFleetSummary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;
@Mapper(componentModel="spring")
public interface TankMapper {
    @Mapping(source="site.name",target="siteName")
    @Mapping(source="site.country",target="siteCountry")
    @Mapping(source="productService.name",target="productService")
    @Mapping(source="riskCategory.code",target="riskCategory")
    @Mapping(source="riskCategory.colorHex",target="riskCategoryColor")
    @Mapping(source="tankId",target="tankId")
    @Mapping(source="operationalStatus",target="operationalStatus")
    @Mapping(source="complianceStatus",target="complianceStatus")
    TankResponse toTankResponse(Tank tank);

    @Mapping(source="tankId",target="tankId")
    @Mapping(source="siteName",target="siteName")
    @Mapping(source="service",target="service")
    @Mapping(source="riskCategory",target="riskCategory")
    @Mapping(source="complianceStatus",target="complianceStatus")
    @Mapping(source="remainingLifeYr",target="remainingLifeYr")
    @Mapping(source="corrosionRate",target="corrosionRate")
    @Mapping(source="nextInspectionDue",target="nextInspectionDue")
    @Mapping(source="lastInspectionDate",target="lastInspectionDate")
    @Mapping(source="lastInspectionType",target="lastInspectionType")
    @Mapping(source="openDefects",target="openDefects")
    TankFleetSummaryResponse toFleetSummaryResponse(VwTankFleetSummary view);
    List<TankFleetSummaryResponse> toFleetSummaryResponseList(List<VwTankFleetSummary> views);
}
