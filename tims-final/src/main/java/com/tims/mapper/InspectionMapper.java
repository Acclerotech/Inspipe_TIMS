package com.tims.mapper;
import com.tims.dto.response.InspectionCalendarResponse;
import com.tims.dto.response.InspectionResponse;
import com.tims.entity.Inspection;
import com.tims.entity.InspectionScopeItem;
import com.tims.entity.view.VwInspectionCalendar;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;
@Mapper(componentModel="spring")
public interface InspectionMapper {
    @Mapping(source="tank.tankId",target="tankId")
    @Mapping(source="inspectionType.code",target="inspectionTypeCode")
    @Mapping(source="inspectionType.label",target="inspectionTypeLabel")
    @Mapping(source="inspectionType.colorHex",target="inspectionTypeColor")
    @Mapping(source="standard.code",target="standardCode")
    @Mapping(source="inspector.fullName",target="inspectorName")
    @Mapping(source="scopeItems",target="scopeItems")
    @Mapping(source="status",target="status")
    InspectionResponse toResponse(Inspection inspection);

    @Mapping(source="scopeItem",target="scopeItem")
    @Mapping(source="completed",target="completed")
    InspectionResponse.ScopeItemResponse toScopeItemResponse(InspectionScopeItem item);
    List<InspectionResponse> toResponseList(List<Inspection> inspections);

    @Mapping(source="inspectionId",target="inspectionId")
    @Mapping(source="tankId",target="tankId")
    @Mapping(source="siteName",target="siteName")
    @Mapping(source="riskCategory",target="riskCategory")
    @Mapping(source="inspectionType",target="inspectionType")
    @Mapping(source="colorHex",target="colorHex")
    @Mapping(source="weekNumber",target="weekNumber")
    @Mapping(source="plannedDate",target="plannedDate")
    @Mapping(source="actualDate",target="actualDate")
    @Mapping(source="status",target="status")
    @Mapping(source="inspectorName",target="inspectorName")
    InspectionCalendarResponse toCalendarResponse(VwInspectionCalendar view);
    List<InspectionCalendarResponse> toCalendarResponseList(List<VwInspectionCalendar> views);
}
