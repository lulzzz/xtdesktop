/*
 * This file is part of the xTuple ERP: PostBooks Edition, a free and
 * open source Enterprise Resource Planning software suite,
 * Copyright (c) 1999-2016 by OpenMFG LLC, d/b/a xTuple.
 * It is licensed to you under the Common Public Attribution License
 * version 1.0, the full text of which (including xTuple-specific Exhibits)
 * is available at www.xtuple.com/CPAL.  By using this software, you agree
 * to be bound by its terms.
 */

var _dockMytodo;
var _todoList;

/*!
  Initializes To Do dock widget and places it in the main window.
*/
function initDockTodo()
{
  _dockMytodo = mainwindow.findChild("_dockMytodo");
  _todoList = mainwindow.findChild("_todoList");

  if (_todoList)
  {
    _todoList.addColumn(qsTr("Type"), XTreeWidget.userColumn, Qt.AlignCenter, true, "type");
    _todoList.addColumn(qsTr("Priority"), XTreeWidget.userColumn, Qt.AlignLeft, false, "priority");
    _todoList.addColumn(qsTr("Assigned To"), XTreeWidget.userColumn, Qt.AlignLeft, false, "usr");
    _todoList.addColumn(qsTr("Name"), -1, Qt.AlignLeft, true, "name");
    _todoList.addColumn(qsTr("Description"), -1, Qt.AlignLeft,   true, "descrip");
    _todoList.addColumn(qsTr("Status"), XTreeWidget.statusColumn, Qt.AlignLeft, false, "status");
    _todoList.addColumn(qsTr("Start Date"), XTreeWidget.dateColumn, Qt.AlignLeft, true, "start");
    _todoList.addColumn(qsTr("Due Date"), XTreeWidget.dateColumn, Qt.AlignLeft, true, "due");
    _todoList.addColumn(qsTr("Parent#"), XTreeWidget.orderColumn, Qt.AlignLeft, false, "number");
    _todoList.addColumn(qsTr("Customer#"), XTreeWidget.orderColumn, Qt.AlignLeft, false, "cust");
    _todoList.addColumn(qsTr("Account#"), XTreeWidget.orderColumn, Qt.AlignLeft, true, "crmacct_number");
    _todoList.addColumn(qsTr("Account Name"), 100, Qt.AlignLeft, false, "crmacct_name");
    _todoList.addColumn(qsTr("Owner"), XTreeWidget.userColumn, Qt.AlignLeft, false,"owner");

    _todoList.itemSelected.connect(openWindowToDo);
    _todoList["populateMenu(QMenu*,XTreeWidgetItem*,int)"].connect(populateMenuToDo);

    if (_dockMytodo)
    {
      _dtTimer.timeout.connect(fillListToDo);
      _dockMytodo.visibilityChanged.connect(fillListToDo);

      // Handle privilege control
      var act = _dockMytodo.toggleViewAction();

      if (!privileges.check("ViewTodoDock"))
      {
        _dockMytodo.hide();
        act.enabled = false;
      }

      // Allow rescan to let them show if privs granted
      act.setData("ViewTodoDock");
      _menuDesktop.appendAction(act);
    }

    fillListToDo();
  }

  function deleteToDo()
  {
    var answer = QMessageBox.question(mainwindow,
                       qsTr("Delete To Do?"),
                       qsTr("This will permenantly delete the To Do item.  Are you sure?"),
                       QMessageBox.Yes | QMessageBox.No,
                       QMessageBox.Yes);
    if(answer == QMessageBox.No)
      return;

    toolbox.executeDbQuery("desktop","todoDelete", { todoitem_id: _todoList.id() } );
    fillListToDo();
  }

  function openWindowToDo()
  {
    params = new Object;
    actId = _todoList.altId();
    act = toDoAct(actId);

    // Make sure we can open the window
    if (!privilegeCheckToDo(act))
      return;

    // Determine which window to open
    if (act == "D") // To Do
    {
      ui = "todoItem";
      if (privileges.check("MaintainAllToDoItems") || privileges.check("MaintainPersonalToDoItems"))
        params.mode = "edit";
      else
        params.mode = "view";
      params.todoitem_id = _todoList.id();
    }
    else if (act == "I")
    {
      ui = "incident";
      if (privileges.check("MaintainAllIncidents") || privileges.check("MaintainPersonalIncidents"))
        params.mode = "edit";
      else
        params.mode = "view";
      params.incdt_id = _todoList.id();
    }
    else if (act == "T")
    {
      ui = "task";
      if (privileges.check("MaintainAllProjects") || privileges.check("MaintainPersonalProjects"))
        params.mode = "edit";
      else
        params.mode = "view"
      params.prjtask_id = _todoList.id();
    }
    else if (act == "P")
    {
      ui = "project";
      if (privileges.check("MaintainAllProjects") || privileges.check("MaintainPersonalProjects"))
        params.mode = "edit";
      else
        params.mode = "view";
      params.prj_id = _todoList.id();
    }

    // Open the window and perform any special handling required
    var newdlg = toolbox.openWindow(ui);
    newdlg.set(params);
    newdlg.exec()
  }

  function toDoAct(actId)
  {
    if (actId == 1)
      return "D";
    else if (actId == 2)
      return "I";
    else if (actId == 3)
      return "T";
    else if (actId == 4)
      return "P"

    return "";
  }

  function populateMenuToDo(pMenu)
  {
    var act = toDoAct(_todoList.altId());
    var menuItem;

    menuItem = pMenu.addAction(_open);
    menuItem.enabled = privilegeCheckToDo(act);
    
    menuItem.triggered.connect(openWindowToDo);

    if (act == "D")
    {
      menuItem = pMenu.addAction(qsTr("Delete"));
      menuItem.enabled = privileges.check("MaintainAllToDoItems") || 
                         privileges.check("MaintainPersonalToDoItems");
      menuItem.triggered.connect(deleteToDo);
    }
  }

  function privilegeCheckToDo(act)
  {
    if (act == "D") // To Do list
      return privileges.check("MaintainAllToDoItems") || privileges.check("MaintainPersonalToDoItems") ||
             privileges.check("ViewAllToDoItems") || privileges.check("ViewPersonalToDoItems");
    else if (act == "I") // Incidents
      return privileges.check("MaintainAllIncidents") || privileges.check("MaintainPersonalIncidents") ||
             privileges.check("ViewAllIncidents") || privileges.check("ViewPersonalIncidents");
    else if (act == "P" || act == "T") // Projects and Tasks
      return privileges.check("MaintainAllProjects") || privileges.check("MaintainPersonalProjects") ||
             privileges.check("ViewAllProjects") || privileges.check("ViewPersonalProjects");

    return false;
  }

}

  function fillListToDo()
  {
    if (!_dockMytodo || !_dockMytodo.visible || !_todoList)
      return;

    var params = {
      todo:              qsTr("To-do"),
      incident:          qsTr("Incident"),
      task:              qsTr("Task"),
      project:           qsTr("Project"),
      todoList:          true,
      incidents:         true,
      projects:          true,
      assigned_username: mainwindow.username(),
      owner_username:    mainwindow.username(),
    };
    _todoList.populate(toolbox.executeDbQuery("desktop", "todoList", params), true);
  }
