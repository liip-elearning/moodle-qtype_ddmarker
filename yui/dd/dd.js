YUI.add('moodle-qtype_ddmarker-dd', function(Y) {
    var DDMARKERDDNAME = 'ddmarker_dd';
    var DDMARKER_DD = function() {
        DDMARKER_DD.superclass.constructor.apply(this, arguments);
    }
    /**
     * This is the base class for the question rendering and question editing form code.
     */
    Y.extend(DDMARKER_DD, Y.Base, {
        doc : null,
        polltimer : null,
        afterimageloaddone : false,
        poll_for_image_load : function (e, waitforimageconstrain, pause, doafterwords) {
            if (this.afterimageloaddone) {
                return;
            }
            var bgdone = this.doc.bg_img().get('complete');
            if (waitforimageconstrain) {
                bgdone = bgdone && this.doc.bg_img().hasClass('constrained');
            }
            if (bgdone) {
                if (this.polltimer !== null) {
                    this.polltimer.cancel();
                    this.polltimer = null;
                }
                this.doc.bg_img().detach('load', this.poll_for_image_load);
                if (pause !== 0) {
                    Y.later(pause, this, doafterwords);
                } else {
                    doafterwords.call(this);
                }
                this.afterimageloaddone = true;
            } else if (this.polltimer === null) {
                var pollarguments = [null, waitforimageconstrain, pause, doafterwords];
                this.polltimer =
                            Y.later(1000, this, this.poll_for_image_load, pollarguments, true);
            }
        },
        /**
         * Object to encapsulate operations on dd area.
         */
        doc_structure : function (mainobj) {
            var topnode = Y.one(this.get('topnode'));
            var dragitemsarea = topnode.one('div.dragitems');
            var dropbgarea = topnode.one('div.droparea');
            return {
                top_node : function() {
                    return topnode;
                },
                bg_img : function() {
                    return topnode.one('.dropbackground');
                },
                load_bg_img : function (url) {
                    dropbgarea.setContent('<img class="dropbackground" src="'+ url +'"/>');
                    this.bg_img().on('load', this.on_image_load, this, 'bg_image');
                },
                drag_items : function() {
                    return dragitemsarea.all('.dragitem');
                },
                drag_items_for_choice : function(choiceno) {
                    return dragitemsarea.all('span.dragitem.choice' + choiceno);
                },
                drag_item_being_dragged : function(choiceno) {
                    return dragitemsarea.one('span.dragitem.yui3-dd-dragging.choice' + choiceno);
                },
                drag_item_home : function (choiceno) {
                    return dragitemsarea.one('span.draghome.choice' + choiceno);
                },
                drag_item_homes : function() {
                    return dragitemsarea.all('span.draghome');
                },
                get_classname_numeric_suffix : function(node, prefix) {
                    var classes = node.getAttribute('class');
                    if (classes !== '') {
                        var classesarr = classes.split(' ');
                        for (index in classesarr) {
                            var patt1 = new RegExp('^'+prefix+'([0-9])+$');
                            if (patt1.test(classesarr[index])) {
                                var patt2 = new RegExp('([0-9])+$');
                                var match = patt2.exec(classesarr[index]);
                                return +match[0];
                            }
                        }
                    }
                    throw 'Prefix "'+prefix+'" not found in class names.';
                },
                inputs_for_choices : function () {
                    return topnode.all('input.choices');
                },
                input_for_choice : function (choiceno) {
                    return topnode.one('input.choice'+choiceno);
                }

            }
        },
        
        colours : ['#FFFFFF', '#B0C4DE', '#DCDCDC', '#D8BFD8',
                   '#87CEFA','#DAA520', '#FFD700', '#F0E68C'],
        nextcolourindex : 0,
        restart_colours : function () {
            this.nextcolourindex = 0;
        },
        get_next_colour : function () {
            var colour = this.colours[this.nextcolourindex];
            this.nextcolourindex++;
            if (this.nextcolourindex === this.colours.length) {
                this.nextcolourindex = 0;
            }
            return colour;
        },
        convert_to_window_xy : function (bgimgxy) {
            return [+bgimgxy[0] + this.doc.bg_img().getX() + 1,
                    +bgimgxy[1] + this.doc.bg_img().getY() + 1];
        }
    }, {
        NAME : DDMARKERDDNAME,
        ATTRS : {
            drops : {value : null},
            readonly : {value : false},
            topnode : {value : null}
        }
    });
    M.qtype_ddmarker = M.qtype_ddmarker || {};
    M.qtype_ddmarker.dd_base_class = DDMARKER_DD;

    var DDMARKERQUESTIONNAME = 'ddmarker_question';
    var DDMARKER_QUESTION = function() {
        DDMARKER_QUESTION.superclass.constructor.apply(this, arguments);
    };
    /**
     * This is the code for question rendering.
     */
    Y.extend(DDMARKER_QUESTION, M.qtype_ddmarker.dd_base_class, {
        initializer : function(params) {
            this.doc = this.doc_structure(this);
            this.poll_for_image_load(null, false, 0, this.after_image_load);
            this.doc.bg_img().after('load', this.poll_for_image_load, this,
                                                    false, 0, this.after_image_load);
            this.doc.drag_item_homes().after('load', this.poll_for_image_load, this,
                                                    false, 0, this.after_image_load);
        },
        after_image_load : function () {
            this.reposition_drags();
            Y.on('windowresize', this.reposition_drags, this);
//            if (!this.get('readonly')) {
//                this.doc.drags().set('tabIndex', 0);
//                this.doc.drags().each(
//                    function(v){
//                        v.on('dragchange', this.drop_zone_key_press, this);
//                    }
//                , this);
//            }
        },
        clone_new_drag_item : function (draghome) {
            var drag = draghome.cloneNode(true);
            drag.removeClass('draghome');
            drag.addClass('dragitem');
            drag.one('span.markertext').setStyle('opacity', 0.5);
            draghome.get('parentNode').appendChild(drag);
            if (!this.get('readonly')) {
                this.draggable(drag);
            }
            return drag;
        },
        draggable : function (drag) {
            var dd = new Y.DD.Drag({
                node: drag,
                dragMode: 'intersect'
            }).plug(Y.Plugin.DDConstrained, {constrain2node: this.doc.top_node()});
            dd.after('drag:start', function(e){
                var dragnode = e.target.get('node');
                var choiceno = this.get_choiceno_for_node(dragnode);
                this.save_all_xy_for_choice(choiceno);
            }, this);
            dd.after('drag:end', function(e) {
                var dragnode = e.target.get('node');
                var choiceno = this.get_choiceno_for_node(dragnode);
                Y.later(100, this, this.save_all_xy_for_choice, choiceno);
            }, this);
        },
        save_all_xy_for_choice: function (choiceno) {
            var dragitems = this.doc.drag_items_for_choice(choiceno);
            var coords = [];
            dragitems.each(function(dragitem){
                var bgimgxy = this.convert_to_bg_img_xy(this.get_target_center_xy(dragitem));
                if (this.xy_in_bgimg(bgimgxy) && !dragitem.hasClass('yui3-dd-dragging')) {
                    coords[coords.length] = bgimgxy;
                }
            }, this);
            console.log({'coords read from display':coords});
            this.set_form_value(choiceno, coords.join(';'));
            this.reposition_drags();
        },
        get_target_center_xy : function (dragitem) {
            console.log('dragitem.getXY()', dragitem.getXY());
            var targetnode = dragitem.one('img.target');
            return [targetnode.getX() + (targetnode.get('offsetWidth') / 2),
                      targetnode.getY() + (targetnode.get('offsetHeight') / 2)];
        },
        convert_target_center_xy_to_drag_xy : function (dragitem, targetcenterxy) {
            var currenttargetxy = this.get_target_center_xy(dragitem);
            var currentdragitemxy = dragitem.getXY();
            var difference = [currenttargetxy[0] - currentdragitemxy[0],
                              currenttargetxy[1] - currentdragitemxy[1]];
            console.log({'targetcenterxy':targetcenterxy});
            console.log({'difference':difference});
            return [targetcenterxy[0] - difference[0],
                            targetcenterxy[1] - difference[1]-1];
        },
        reset_drag_xy : function (choiceno) {
            this.set_form_value(choiceno, '');
        },
        set_form_value : function (choiceno, value) {
            this.doc.input_for_choice(choiceno).set('value', value);
        },
        //make sure xy value is not out of bounds of bg image
        xy_in_bgimg : function (bgimgxy) {
            if ((bgimgxy[0] < 0) ||
                    (bgimgxy[1] < 0) ||
                    (bgimgxy[0] > this.doc.bg_img().get('width')) || 
                    (bgimgxy[1] > this.doc.bg_img().get('height'))){
                return false;
            } else {
                return true;
            }
        },
        convert_to_bg_img_xy : function (windowxy) {
            return [Math.round(+windowxy[0] - this.doc.bg_img().getX()-1),
                    Math.round(+windowxy[1] - this.doc.bg_img().getY()-1)];
        },
        reposition_drags : function() {
            this.doc.drag_items().each(function(item) {
                if (!item.hasClass('yui3-dd-dragging')){
                    item.remove(true);
                }
            }, this);
            this.doc.inputs_for_choices().each(function (input) {
                var choiceno = this.get_choiceno_for_node(input);
                var coords = this.get_coords(input);
                var dragitemhome = this.doc.drag_item_home(choiceno);
                for (var i=0; i < coords.length; i++) {
                    var dragitem = this.clone_new_drag_item(dragitemhome);
                    dragitem.setXY(coords[i]);
                }
            }, this);
        },
        /**
         * Return coords of all drag items except any that are currently being dragged
         * based on contents of hidden inputs and whether drags are 'infinite'
         */
        get_coords : function (input) {
            var choiceno = this.get_choiceno_for_node(input);
            var fv = input.get('value');
            var infinite = input.hasClass('infinite');
            var dragging = (null !== this.doc.drag_item_being_dragged(choiceno));
            var coords = [];
            var dragitemhome = this.doc.drag_item_home(choiceno);
            if (infinite || (!dragging && fv === '')) {
                coords[coords.length] = dragitemhome.getXY();
            }
            if (fv !== '') {
                var coordsstrings = fv.split(';');
                for (var i=0; i<coordsstrings.length; i++) {
                    var targetxy = this.convert_to_window_xy(coordsstrings[i].split(','));
                    var dragxy = this.convert_target_center_xy_to_drag_xy(dragitemhome, targetxy);
                    coords[coords.length] = dragxy;
                    console.log('coords[coords.length]', dragxy);
                }
            }
            return coords;
        },
        get_choiceno_for_node : function(node) {
            return +this.doc.get_classname_numeric_suffix(node, 'choice');
        },
        
        //----------- keyboard accessibility stuff below line ---------------------
        drop_zone_key_press : function (e) {
            switch (e.direction) {
                case 'next' :
                    this.place_next_drag_in(e.target);
                    break;
                case 'previous' :
                    this.place_previous_drag_in(e.target);
                    break;
                case 'remove' :
                    this.remove_drag_from_drop(e.target);
                    break;
            }
            e.preventDefault();
            this.reposition_drags();
        },
        place_next_drag_in : function (drop) {
            this.search_for_unplaced_drop_choice(drop, 1);
        },
        place_previous_drag_in : function (drop) {
            this.search_for_unplaced_drop_choice(drop, -1);
        },
        search_for_unplaced_drop_choice : function (drop, direction) {
            var next;
            var current = this.current_drag_in_drop(drop);
            if ('' === current) {
                if (direction == 1) {
                    next = 1;
                } else {
                    next = 1;
                    var groupno = drop.getData('group');
                    this.doc.drag_items_in_group(groupno).each(function(drag) {
                        next = Math.max(next, drag.getData('choice'));
                    }, this);
                }
            } else {
                next = + current + direction;
            }
            var drag;
            do {
                if (this.get_choices_for_drop(next, drop).size() === 0){
                    this.remove_drag_from_drop(drop);
                    return;
                } else {
                    drag = this.get_unplaced_choice_for_drop(next, drop);
                }
                next = next + direction;
            } while (drag === null);
            this.place_drag_in_drop(drag, drop);
        },
        current_drag_in_drop : function (drop) {
            var inputid = drop.getData('inputid');
            var inputnode = Y.one('input#'+inputid);
            return inputnode.get('value');
        },
        remove_drag_from_drop : function (drop) {
            this.place_drag_in_drop(null, drop);
        },
        get_choices_for_drop : function(choice, drop) {
            var group = drop.getData('group');
            var dragitem = null;
            var dragitems = this.doc.top_node()
                                .all('div.dragitemgroup'+group+' .choice'+choice+'.drag');
            return dragitems;
        },
        get_unplaced_choice_for_drop : function(choice, drop) {
            var dragitems = this.get_choices_for_drop(choice, drop);
            var dragitem = null;
            if (dragitems.some(function (d) {
                if (!d.hasClass('placed') && !d.hasClass('yui3-dd-dragging')) {
                    dragitem = d;
                    return true;
                } else {
                    return false;
                }
            }));
            return dragitem;
        }

    }, {NAME : DDMARKERQUESTIONNAME, ATTRS : {}});

    Y.Event.define('dragchange', {
        // Webkit and IE repeat keydown when you hold down arrow keys.
        // Opera links keypress to page scroll; others keydown.
        // Firefox prevents page scroll via preventDefault() on either
        // keydown or keypress.
        _event: (Y.UA.webkit || Y.UA.ie) ? 'keydown' : 'keypress',

        _keys: {
            '32': 'next',
            '37': 'previous',
            '38': 'previous',
            '39': 'next',
            '40': 'next',
            '27': 'remove'
        },

        _keyHandler: function (e, notifier) {
            if (this._keys[e.keyCode]) {
                e.direction = this._keys[e.keyCode];
                notifier.fire(e);
            }
        },

        on: function (node, sub, notifier) {
            sub._detacher = node.on(this._event, this._keyHandler,
                                    this, notifier);
        }
    });
    M.qtype_ddmarker.init_question = function(config) {
        return new DDMARKER_QUESTION(config);
    }
}, '@VERSION@', {
      requires:['node', 'dd', 'dd-drop', 'dd-constrain']
});
