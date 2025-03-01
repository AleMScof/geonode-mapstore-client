/*
 * Copyright 2020, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import Message from '@mapstore/framework/components/I18N/Message';
import { Glyphicon } from 'react-bootstrap';
import { mapInfoSelector } from '@mapstore/framework/selectors/map';
import { isLoggedIn } from '@mapstore/framework/selectors/security';
import Button from '@js/components/Button';
import {
    saveContent,
    clearSave
} from '@js/actions/gnsave';
import controls from '@mapstore/framework/reducers/controls';
import gnresource from '@js/reducers/gnresource';
import gnsave from '@js/reducers/gnsave';
import gnsaveEpics from '@js/epics/gnsave';
import SaveModal from '@js/plugins/save/SaveModal';
import {
    canAddResource,
    getResourceId,
    getResourceData,
    isNewResource,
    getResourceDirtyState
} from '@js/selectors/resource';
import { ProcessTypes } from '@js/utils/ResourceServiceUtils';
import { processResources } from '@js/actions/gnresource';
import { getCurrentResourceCopyLoading } from '@js/selectors/resourceservice';

/**
 * Plugin for SaveAs modal
 * @name SaveAs
 * @class
 * @memberof plugins
 * @prop {object} cfg.thumbnailOptions the thumbnail is scaled based on the following configuration
 * @prop {number} cfg.thumbnailOptions.width final width of thumbnail
 * @prop {number} cfg.thumbnailOptions.height final height of thumbnail
 * @prop {string} cfg.thumbnailOptions.type type format of thumbnail 'image/jpeg' or 'image/png'
 * @prop {number} cfg.thumbnailOptions.quality image quality if type is 'image/jpeg', value between 0 and 1
 * @prop {bool} cfg.thumbnailOptions.contain if contain is true the thumbnail is contained in the width and height provided, if contain is false the image will cover the provided width and height
 * @example
 * {
 *   "name": "SaveAs",
 *   "cfg": {
 *     "thumbnailOptions": {
 *       "width": 300,
 *       "height": 250,
 *       "type": "image/jpeg",
 *       "quality": 0.9,
 *       "contain": false
 *     }
 *   }
 * }
 */
function SaveAs({
    resources,
    onSave,
    onCopy,
    isNew,
    closeOnSave,
    labelId,
    ...props
}) {
    return (
        <SaveModal
            {...props}
            hideThumbnail={!isNew}
            hideDescription={!isNew}
            // add key to reset the component when a new resource is returned
            key={props?.resource?.pk || 'new'}
            labelId={labelId || 'save'}
            onSave={(id, metadata, reload) => {
                if (isNew) {
                    // only new resource follow the sync save
                    onSave(id, metadata, reload);
                } else {
                    // existing resource are using the async copy workflow
                    onCopy([
                        {
                            ...props?.resource,
                            title: metadata.name || props?.resource?.title
                        }
                    ]);
                }
                // catalogue page must close the clone modal as soon as the user click on clone
                if (closeOnSave) {
                    props.onClose();
                }
            }}
        />
    );
}

const SaveAsPlugin = connect(
    createSelector([
        state => state?.controls?.[ProcessTypes.COPY_RESOURCE]?.value,
        mapInfoSelector,
        state => state?.gnresource?.loading,
        state => state?.gnsave?.saving,
        state => state?.gnsave?.error,
        state => state?.gnsave?.success,
        getResourceId,
        isNewResource,
        getCurrentResourceCopyLoading
    ], (resources, mapInfo, loading, saving, error, success, contentId, isNew, processLoading) => ({
        enabled: !!resources,
        contentId: contentId || mapInfo?.id,
        resource: resources?.[0],
        loading: processLoading || loading,
        saving,
        error,
        success,
        isNew
    })),
    {
        onClose: setControlProperty.bind(null, ProcessTypes.COPY_RESOURCE, 'value', undefined),
        onSave: saveContent,
        onCopy: processResources.bind(null, ProcessTypes.COPY_RESOURCE),
        onClear: clearSave
    }
)(SaveAs);

function SaveAsButton({
    enabled,
    onClick,
    variant,
    size,
    resource,
    disabled
}) {
    return enabled
        ? <Button
            variant={variant || "primary"}
            size={size}
            disabled={disabled}
            onClick={() => onClick([ resource ])}
        >
            <Message msgId="saveAs"/>
        </Button>
        : null
    ;
}

const ConnectedSaveAsButton = connect(
    createSelector(
        isLoggedIn,
        canAddResource,
        getResourceData,
        getResourceDirtyState,
        (loggedIn, userCanAddResource, resource, dirtyState) => ({
            enabled: loggedIn && userCanAddResource,
            resource,
            disabled: !!dirtyState
        })
    ),
    {
        onClick: setControlProperty.bind(null, ProcessTypes.COPY_RESOURCE, 'value')
    }
)((SaveAsButton));

export default createPlugin('SaveAs', {
    component: SaveAsPlugin,
    containers: {
        BurgerMenu: {
            name: 'saveAs',
            position: 30,
            text: <Message msgId="saveAs"/>,
            icon: <Glyphicon glyph="floppy-open"/>,
            action: setControlProperty.bind(null, 'saveAs', null),
            selector: createSelector(
                isLoggedIn,
                canAddResource,
                (loggedIn, userCanAddResource) => ({
                    style: (loggedIn && userCanAddResource) ? {} : { display: 'none' }
                })
            )
        },
        ActionNavbar: {
            name: 'SaveAs',
            Component: ConnectedSaveAsButton
        }
    },
    epics: {
        ...gnsaveEpics
    },
    reducers: {
        gnresource,
        gnsave,
        controls
    }
});
