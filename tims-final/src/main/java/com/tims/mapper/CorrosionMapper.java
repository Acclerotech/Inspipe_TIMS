package com.tims.mapper;
import com.tims.dto.response.CorrosionAssessmentResponse;
import com.tims.dto.response.ThicknessHistoryResponse;
import com.tims.entity.CorrosionAssessment;
import com.tims.entity.ThicknessHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;
@Mapper(componentModel="spring")
public interface CorrosionMapper {

    @Mapping(source="tank.tankId", target="tankId")
    @Mapping(source="standard.code", target="standardCode")
    @Mapping(source="assessedBy.fullName", target="assessedByName")
   // @Mapping(source="kFactor", target="kFactor")
    CorrosionAssessmentResponse toResponse(CorrosionAssessment assessment);

    @Mapping(source="measurementYear",target="measurementYear")
    @Mapping(source="avgThicknessMm",target="avgThicknessMm")
    @Mapping(source="minThicknessMm",target="minThicknessMm")
    @Mapping(source="shellCourse",target="shellCourse")
    @Mapping(source="source",target="source")
    ThicknessHistoryResponse toThicknessResponse(ThicknessHistory history);
    List<ThicknessHistoryResponse> toThicknessResponseList(List<ThicknessHistory> histories);
}
