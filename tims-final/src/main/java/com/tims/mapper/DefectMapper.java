package com.tims.mapper;
import com.tims.dto.response.DefectHeatmapResponse;
import com.tims.dto.response.DefectResponse;
import com.tims.entity.Defect;
import com.tims.entity.view.VwDefectHeatmap;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;
@Mapper(componentModel="spring")
public interface DefectMapper {
    @Mapping(source="tank.tankId",target="tankId")
    @Mapping(source="defectClass.classNum",target="defectClassNum")
    @Mapping(source="defectClass.label",target="defectClassLabel")
    @Mapping(source="component",target="component")
    @Mapping(source="status",target="status")
    DefectResponse toResponse(Defect defect);
    List<DefectResponse> toResponseList(List<Defect> defects);

    @Mapping(source="defectCode",target="defectCode")
    @Mapping(source="tankId",target="tankId")
    @Mapping(source="component",target="component")
    @Mapping(source="defectType",target="defectType")
  //@Mapping(source="severity",target="severity")
    @Mapping(source="classNum",target="classNum")
    @Mapping(source="status",target="status")
    DefectHeatmapResponse toHeatmapResponse(VwDefectHeatmap view);
    List<DefectHeatmapResponse> toHeatmapResponseList(List<VwDefectHeatmap> views);
}
