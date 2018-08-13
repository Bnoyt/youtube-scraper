/**
 * LINKURIOUS CONFIDENTIAL
 * Copyright Linkurious SAS 2012 - 2018
 *
 * - Created on 2017-06-12.
 */
'use strict';

// access rights of builtin groups are not actually saved on the sql db

const ADMIN_ACCESS_RIGHTS = [
  {
    targetType: 'action',
    targetName: 'admin.users',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.alerts',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.connect',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.index',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.resetDefaults',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.app',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.report',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.users.delete',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.config',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawReadQuery',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawWriteQuery',
    type: 'do'
  },
  {
    targetType: 'nodeCategory',
    targetName: '*',
    type: 'write'
  },
  {
    targetType: 'edgeType',
    targetName: '*',
    type: 'write'
  },
  {
    targetType: 'alert',
    targetName: '*',
    type: 'read'
  }
];
const SOURCE_MANAGER_ACCESS_RIGHTS = [
  {
    targetType: 'action',
    targetName: 'rawReadQuery',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawWriteQuery',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.users',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.alerts',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.connect',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.index',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.resetDefaults',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'admin.report',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawReadQuery',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawWriteQuery',
    type: 'do'
  },
  {
    targetType: 'nodeCategory',
    targetName: '*',
    type: 'write'
  },
  {
    targetType: 'edgeType',
    targetName: '*',
    type: 'write'
  },
  {
    targetType: 'alert',
    targetName: '*',
    type: 'read'
  }
];
const READ_EDIT_DELETE_ACCESS_RIGHTS = [
  {
    targetType: 'action',
    targetName: 'admin.alerts',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawReadQuery',
    type: 'do'
  },
  {
    targetType: 'action',
    targetName: 'rawWriteQuery',
    type: 'do'
  },
  {
    targetType: 'nodeCategory',
    targetName: '*',
    type: 'write'
  },
  {
    targetType: 'edgeType',
    targetName: '*',
    type: 'write'
  },
  {
    targetType: 'alert',
    targetName: '*',
    type: 'read'
  }
];
const READ_EDIT_ACCESS_RIGHTS = [
  {
    targetType: 'action',
    targetName: 'rawReadQuery',
    type: 'do'
  },
  {
    targetType: 'nodeCategory',
    targetName: '*',
    type: 'edit'
  },
  {
    targetType: 'edgeType',
    targetName: '*',
    type: 'edit'
  },
  {
    targetType: 'alert',
    targetName: '*',
    type: 'read'
  }
];
const READ_ACCESS_RIGHTS = [
  {
    targetType: 'action',
    targetName: 'rawReadQuery',
    type: 'do'
  },
  {
    targetType: 'nodeCategory',
    targetName: '*',
    type: 'read'
  },
  {
    targetType: 'edgeType',
    targetName: '*',
    type: 'read'
  },
  {
    targetType: 'alert',
    targetName: '*',
    type: 'read'
  }
];
const READ_ONLY_ACCESS_RIGHTS = [
  {
    targetType: 'nodeCategory',
    targetName: '*',
    type: 'read'
  },
  {
    targetType: 'edgeType',
    targetName: '*',
    type: 'read'
  }
];

module.exports = {
  ADMIN_ACCESS_RIGHTS,
  SOURCE_MANAGER_ACCESS_RIGHTS,
  READ_EDIT_DELETE_ACCESS_RIGHTS,
  READ_EDIT_ACCESS_RIGHTS,
  READ_ACCESS_RIGHTS,
  READ_ONLY_ACCESS_RIGHTS
};
