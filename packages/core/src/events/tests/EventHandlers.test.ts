import { EventHandlers } from "../EventHandlers";
import { createShadow } from "../createShadow";

jest.mock("debounce", () => ({
  debounce: (f) => (...args) => f(...args),
}));
jest.mock("../createShadow", () => ({
  createShadow: () => null,
}));

describe("EventHandlers", () => {
  const nodeId = "3901";
  const getHandler = (events, name) =>
    events.find(([eventName]) => name === eventName);
  const callHandler = (events, name) => getHandler(events, name)[1];
  const shadow = "a shadow";

  let e;
  let eventHandlers;
  let store;
  let actions;
  let query;

  beforeEach(() => {
    e = {
      preventDefault: jest.fn(),
      stopImmediatePropagation: jest.fn(),
      stopPropagation: jest.fn(),
    };

    createShadow = jest.fn().mockImplementation(() => shadow);

    EventHandlers.draggedElement = undefined;
    EventHandlers.draggedElementShadow = undefined;
    EventHandlers.events = undefined;

    actions = {
      addTreeAtIndex: jest.fn(),
      move: jest.fn(),
      setIndicator: jest.fn(),
      setNodeEvent: jest.fn(),
    };
    query = {
      parseTreeFromReactNode: jest.fn(),
      getDropPlaceholder: jest.fn(),
    };
    store = { actions, query };
    eventHandlers = new EventHandlers(store);
  });

  describe("handlers.select", () => {
    let select;

    beforeEach(() => {
      select = eventHandlers.handlers().select;
    });
    it("should call setNodeEvent on init", () => {
      select.init()();
      expect(actions.setNodeEvent).toHaveBeenCalledWith("selected", null);
    });
    it("should contain one event with mousedown", () => {
      expect(select.events).toHaveLength(1);
      expect(getHandler(select.events, "mousedown")).toBeDefined();
    });
    it("should call setNodeEvent on mousedown", () => {
      callHandler(select.events, "mousedown")(null, nodeId);
      expect(actions.setNodeEvent).toHaveBeenCalledWith("selected", nodeId);
    });
  });

  describe("handlers.hover", () => {
    let hover;

    beforeEach(() => {
      hover = eventHandlers.handlers().hover;
    });
    it("should call setNodeEvent on init", () => {
      hover.init()();
      expect(actions.setNodeEvent).toHaveBeenCalledWith("hovered", null);
    });
    it("should contain one event with mousedown", () => {
      expect(hover.events).toHaveLength(1);
      expect(getHandler(hover.events, "mouseover")).toBeDefined();
    });
    it("should call setNodeEvent on mouseover", () => {
      callHandler(hover.events, "mouseover")(null, nodeId);
      expect(actions.setNodeEvent).toHaveBeenCalledWith("hovered", nodeId);
    });
  });

  describe("handlers.drop", () => {
    let drop;

    beforeEach(() => {
      e = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
      drop = eventHandlers.handlers().drop;
    });
    it("should contain two events, dragover and dragenter", () => {
      expect(drop.events).toHaveLength(2);
      expect(getHandler(drop.events, "dragover")).toBeDefined();
      expect(getHandler(drop.events, "dragenter")).toBeDefined();
    });
    it("should have prevented default on dragover", () => {
      callHandler(drop.events, "dragover")(e);
      expect(e.preventDefault).toHaveBeenCalled();
      expect(e.stopPropagation).toHaveBeenCalled();
      expect(actions.setIndicator).not.toHaveBeenCalled();
    });

    describe("dragenter with no dragged element", () => {
      beforeEach(() => {
        callHandler(drop.events, "dragenter")(e);
      });
      it("should have prevented default", () => {
        expect(e.preventDefault).toHaveBeenCalled();
        expect(e.stopPropagation).toHaveBeenCalled();
      });
      it("should have not called set indicator or getDropPlacehalder", () => {
        expect(actions.setIndicator).not.toHaveBeenCalled();
        expect(query.getDropPlaceholder).not.toHaveBeenCalled();
      });
      it("should not have set the indicator", () => {
        expect(actions.setIndicator).not.toHaveBeenCalled();
      });
    });

    describe("dragenter with a dragged element and a placeholder", () => {
      const coordinates = { x: 130, y: 310 };
      const draggedElement = "an element";
      const indicator = "an indicator";

      beforeEach(() => {
        EventHandlers.draggedElement = draggedElement;
        query.getDropPlaceholder.mockImplementationOnce(() => indicator);
        e.clientY = coordinates.y;
        e.clientX = coordinates.x;
        callHandler(drop.events, "dragenter")(e, nodeId);
      });
      it("should have prevented default", () => {
        expect(e.preventDefault).toHaveBeenCalled();
        expect(e.stopPropagation).toHaveBeenCalled();
      });
      it("should have called getdropPlaceholder with the right arguments", () => {
        expect(query.getDropPlaceholder).toHaveBeenCalledWith(
          draggedElement,
          nodeId,
          coordinates
        );
      });
      it("should have called set indicator or getDropPlacehalder", () => {
        expect(actions.setIndicator).toHaveBeenCalledWith(indicator);
      });
      it("should have set EventHandlers.evenst", () => {
        expect(EventHandlers.events).toEqual({ indicator });
      });
    });
  });

  describe("handlers.drag", () => {
    const shadow = "a shadow";
    let drag;
    let el;

    beforeEach(() => {
      drag = eventHandlers.handlers().drag;
      el = { setAttribute: jest.fn() };
    });
    it("should contain two events, dragover and dragenter", () => {
      expect(drag.events).toHaveLength(2);
      expect(getHandler(drag.events, "dragstart")).toBeDefined();
      expect(getHandler(drag.events, "dragend")).toBeDefined();
    });

    describe("init", () => {
      beforeEach(() => {
        drag.init(el)();
      });
      it("should call setAttribute twice on init", () => {
        expect(el.setAttribute).toHaveBeenCalledTimes(2);
      });
      it("should call setAttribute with the right arguments", () => {
        expect(el.setAttribute).toHaveBeenNthCalledWith(1, "draggable", true);
        expect(el.setAttribute).toHaveBeenNthCalledWith(2, "draggable", false);
      });
    });

    describe("dragstart", () => {
      beforeEach(() => {
        callHandler(drag.events, "dragstart")(e, nodeId);
      });
      it("should have stopped propagation", () => {
        expect(e.stopImmediatePropagation).toHaveBeenCalled();
        expect(e.stopPropagation).toHaveBeenCalled();
      });
      it("should call setNodeEvent on mousedown", () => {
        expect(actions.setNodeEvent).toHaveBeenCalledWith("dragged", nodeId);
      });
      it("should have called createShadow", () => {
        expect(createShadow).toHaveBeenCalled();
      });
      it("should have set the correct dragged elements", () => {
        expect(EventHandlers.draggedElement).toEqual(nodeId);
        expect(EventHandlers.draggedElementShadow).toEqual(shadow);
      });
    });

    describe("dragend", () => {
      const events = {
        indicator: {
          placement: { parent: { id: 1 }, where: "after", index: 1 },
        },
      };

      describe("if there are no elements or events", () => {
        beforeEach(() => {
          callHandler(drag.events, "dragend")(e, nodeId);
        });
        it("should have stopped propagation", () => {
          expect(e.stopImmediatePropagation).not.toHaveBeenCalled();
          expect(e.stopPropagation).toHaveBeenCalled();
        });
        it("should have not call move", () => {
          expect(actions.move).not.toHaveBeenCalled();
        });
      });

      describe("if there are all the events", () => {
        beforeEach(() => {
          EventHandlers.events = events;
          EventHandlers.draggedElement = nodeId;
          callHandler(drag.events, "dragend")(e, nodeId);
        });
        it("should have called the right actions", () => {
          expect(actions.setIndicator).toHaveBeenCalledWith(null);
          expect(actions.setNodeEvent).toHaveBeenCalledWith("dragged", null);
        });
        it("should have reset all the variables", () => {
          expect(EventHandlers.draggedElement).toBe(null);
          expect(EventHandlers.draggedElementShadow).toBe(undefined);
        });
        it("should have call move", () => {
          expect(actions.move).toHaveBeenCalledWith(
            nodeId,
            events.indicator.placement.parent.id,
            2
          );
        });
      });
    });
  });

  describe("handlers.create", () => {
    let create;
    let el;

    beforeEach(() => {
      createShadow = jest.fn().mockImplementation(() => shadow);
      create = eventHandlers.handlers().create;
      el = { setAttribute: jest.fn(), removeAttribute: jest.fn() };
    });
    it("should contain two events, dragover and dragenter", () => {
      expect(create.events).toHaveLength(2);
      expect(getHandler(create.events, "dragstart")).toBeDefined();
      expect(getHandler(create.events, "dragend")).toBeDefined();
    });

    describe("init", () => {
      beforeEach(() => {
        create.init(el)();
      });
      it("should call setAttribute twice on init", () => {
        expect(el.setAttribute).toHaveBeenCalledTimes(1);
        expect(el.removeAttribute).toHaveBeenCalledTimes(1);
      });
      it("should call setAttribute with the right arguments", () => {
        expect(el.setAttribute).toHaveBeenNthCalledWith(1, "draggable", true);
        expect(el.removeAttribute).toHaveBeenNthCalledWith(1, "draggable");
      });
    });

    describe("dragstart", () => {
      const node = "a node";
      beforeEach(() => {
        query.parseTreeFromReactNode.mockImplementationOnce(() => node);
        callHandler(create.events, "dragstart")(e, nodeId);
      });
      it("should have stopped propagation", () => {
        expect(e.stopImmediatePropagation).toHaveBeenCalled();
        expect(e.stopPropagation).toHaveBeenCalled();
      });
      it("should call parseTreeFromReactNode on mousedown", () => {
        expect(query.parseTreeFromReactNode).toHaveBeenCalledWith(nodeId);
      });
      it("should have called createShadow", () => {
        expect(createShadow).toHaveBeenCalled();
      });
      it("should have set the correct dragged elements", () => {
        expect(EventHandlers.draggedElement).toEqual(node);
        expect(EventHandlers.draggedElementShadow).toEqual(shadow);
      });
    });

    describe("dragend", () => {
      const events = {
        indicator: {
          placement: { parent: { id: 1 }, where: "before", index: 1 },
        },
      };

      describe("if there are no elements or events", () => {
        beforeEach(() => {
          callHandler(create.events, "dragend")(e, nodeId);
        });
        it("should have stopped propagation", () => {
          expect(e.stopImmediatePropagation).not.toHaveBeenCalled();
          expect(e.stopPropagation).toHaveBeenCalled();
        });
        it("should have not call addTreeAtIndex", () => {
          expect(actions.addTreeAtIndex).not.toHaveBeenCalled();
        });
      });

      describe("if there are all the events", () => {
        beforeEach(() => {
          EventHandlers.events = events;
          EventHandlers.draggedElement = nodeId;
          callHandler(create.events, "dragend")(e, nodeId);
        });
        it("should have called the right actions", () => {
          expect(actions.setIndicator).toHaveBeenCalledWith(null);
          expect(actions.setNodeEvent).toHaveBeenCalledWith("dragged", null);
        });
        it("should have reset all the variables", () => {
          expect(EventHandlers.draggedElement).toBe(null);
          expect(EventHandlers.draggedElementShadow).toBe(undefined);
        });
        it("should have call addTreeAtIndex", () => {
          expect(actions.addTreeAtIndex).toHaveBeenCalledWith(
            nodeId,
            events.indicator.placement.parent.id,
            events.indicator.placement.index
          );
        });
      });
    });
  });
});
