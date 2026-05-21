package com.tims.mapper;
import com.tims.dto.response.ComplianceReportResponse;
import com.tims.entity.ComplianceReport;
import com.tims.entity.ReportSection;
import com.tims.entity.ReportSignatory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import java.util.List;
@Mapper(componentModel="spring")
public interface ReportMapper {
    @Mapping(source="tank.tankId",target="tankId")
    @Mapping(source="template.code",target="templateCode")
    @Mapping(source="template.label",target="templateLabel")
    @Mapping(source="standard.code",target="standardCode")
    @Mapping(source="generatedBy.fullName",target="generatedByName")
    @Mapping(source="sections",target="sections")
    @Mapping(source="signatories",target="signatories")
    ComplianceReportResponse toResponse(ComplianceReport report);

    @Mapping(source="sectionName",target="sectionName")
    @Mapping(source="included",target="included")
    @Mapping(source="sortOrder",target="sortOrder")
    ComplianceReportResponse.SectionResponse toSectionResponse(ReportSection section);

    @Mapping(source="user.fullName",target="userFullName")
    @Mapping(source="role",target="role")
    @Mapping(source="signedAt",target="signedAt")
    ComplianceReportResponse.SignatoryResponse toSignatoryResponse(ReportSignatory signatory);
    List<ComplianceReportResponse> toResponseList(List<ComplianceReport> reports);
}
