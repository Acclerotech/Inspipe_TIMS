package com.tims.repository;

import com.tims.entity.AssetTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssetTagRepository extends JpaRepository<AssetTag, Integer> {

    /** All tags for a given Asset record (assets.id PK). */
    List<AssetTag> findByAssetId(Integer assetId);

    /** Bulk delete — used when replacing tags on an existing asset. */
    void deleteByAssetId(Integer assetId);
}
