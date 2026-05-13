package com.tims.mapper;
import com.tims.dto.response.IngestionJobResponse;
import com.tims.entity.IngestionJob;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;
@Mapper(componentModel="spring")
public interface IngestionMapper {
    @Mapping(source="tank.tankId",target="tankId")
    @Mapping(source="inspection.id",target="inspectionId")
    @Mapping(source="uploadedBy.fullName",target="uploadedByName")
    @Mapping(source="technique",target="technique")
    @Mapping(source="status",target="status")
    IngestionJobResponse toResponse(IngestionJob job);
    List<IngestionJobResponse> toResponseList(List<IngestionJob> jobs);
}
