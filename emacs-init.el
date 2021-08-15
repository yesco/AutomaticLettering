// copy this file to
// - ~/.emacs.d/init.el
// (make sure no ~/.emacs)

;; https://stackoverflow.com/questions/17659212/dont-display-compilation-buffer-in-emacs-until-the-process-exits-with-error-o

;; yeah, for long lines...
(setq truncate-lines 'true)

;; no menu
(menu-bar-mode -1)

;; show only column > 16!!!
;; (font-lock-add-keywords nil '(("^.{0,16}" (0 '(face nil invisible t)))))


;; colors


;; No frigging way!
(setq-default indent-tabs-mode nil)

;; enable to run ./check after each save
;; irritating as it asks to kill it if running
; (add-hook 'after-save-hook 'AL-check)
;; (add-hook 'after-save-hook #'AL-check)

;; (AL-check)
(defun AL-check ()
  "Check AL files at save time"
  (save-window-excursion
    (compile "./check")))

(setq compilation-auto-jump-to-first-error nil)

;; this will open he file and display the compilation if there was an error
;; if there is no error, it'll say "moved past last error"
(add-hook 'compilation-finish-functions
          'next-error)


(add-hook 'after-change-major-mode-hook (lambda() (electric-indent-mode -1)))

(setq c-basic-offset 2)
(setq js-indent-level 2)

;; if you want to see long lines wrapped
;;(setq wrap-prefix "\t\t\-\\\\")

(defun my-next-error
   (orig-fun &rest args)
   (ignore-errors
     (apply orig-fun args)))
     
(advice-add 'next-error :around
            #'my-next-error)


;; dired - https://emacs.stackexchange.com/questions/35676/customize-direds-display/35685#35685
(require 'cl-lib)
(require 'dired)
(require 'easymenu)

(defun add-to-invisible-prop (beg end sym &optional obj)
  "Add invisible text property SYM to region from BEG to END of object OBJ.
OBJ defaults to the current buffer."
;; jsk remove
;;  (declare (special interval)) ; Should not be necessary. Actually a bug in cl.
  (unless obj
    (setq obj (current-buffer)))
  (cl-loop for interval being the intervals property 'invisible from beg to end of obj do
           (let ((prop (get-text-property (car interval) 'invisible obj)))
             (put-text-property
              (car interval)
              (cdr interval)
              'invisible
              (cond
               ((null prop) sym)
               ((listp prop) (cl-union prop (list sym)))
               (t (list prop sym)))
              obj))))

(defconst diredTZA-name-regexp " *[[:alpha:]].*?"
  "Almost anything can be part of the user name.
See, e.g., http://blog.endpoint.com/2008/08/on-valid-unix-usernames-and-ones-sanity.html.
This regular expression tries to make some sensible assumption.")

(defvar diredTZA-ls-output-fields nil
  "Fields output by \"ls -l\" in one line.
Each field is a list with following members:
0: `invisible' property that is set on this field in dired buffers
1: regular expression identifying the field
2: human readable description of the field
See the POSIX specification for designing the regular expressions:
http://pubs.opengroup.org/onlinepubs/9699919799/utilities/ls.html")
(setq diredTZA-ls-output-fields
  `((diredTZA-file-type-perms " *[dbclp-]\\(?:[r-][w-][SsTtx-]\\)\\{3,3\\}[+.@ ]?" "File type & permissions")
    (diredTZA-num-of-hard-links " *[0-9]+" "Number of hard-links")
    (diredTZA-owner ,diredTZA-name-regexp "Owner")
    (diredTZA-group ,diredTZA-name-regexp "Group")
    (diredTZA-size " *[0-9.]*[0-9KMGT]" "Size")
    (diredTZA-last-modified " *[[:alpha:]]+ +[0-9]\\{1,2\\} +\\(?:[0-9]\\{1,2\\}:[0-9]\\{1,2\\}\\|[0-9]\\{4,4\\}\\)" "Date")
    (diredTZA-filename " *[^[:blank:]].*" "Name")))

(defvar diredTZA-ls-regexp nil
  "Regular expression composed of the regular expressions in `diredTZA-ls-output-fields'.
(Don't change this.)")
(setq diredTZA-ls-regexp (concat "\\(" (mapconcat 'identity (mapcar 'cadr diredTZA-ls-output-fields) "\\) +\\(") "\\)"))

(defcustom diredTZA-invisible-props '(diredTZA-file-type-perms diredTZA-num-of-hard-links diredTZA-owner diredTZA-group)
  "Details that should not be shown by dired."
  :type (append '(set) (mapcar (lambda (field) (list 'const :tag (nth 2 field) (car field))) diredTZA-ls-output-fields))
  :group 'dired-hide-details)

(defun diredTZA-add-invisible-props ()
  "Add invisible properties to fields of ls -l output in dired buffers.
Can be added to `dired-after-readin-hook'."
  (let ((inhibit-read-only t))
    (save-excursion
      (goto-char (point-min))
      (while (re-search-forward diredTZA-ls-regexp nil t)
        (cl-loop for i from 1 upto (length diredTZA-ls-output-fields) do
                 (let ((b (match-beginning i))
                       (e (match-end i)))
                   (add-to-invisible-prop b e (car (nth (1- i) diredTZA-ls-output-fields)))))))))

(add-hook 'dired-after-readin-hook #'diredTZA-add-invisible-props t)

(defun diredTZA-invisible-prop-p (sym)
  "Check whether SYM is in `buffer-invisibility-spec'."
  (if (atom buffer-invisibility-spec)
      (eq buffer-invisibility-spec sym)
    (assoc-string sym buffer-invisibility-spec)))

(defun diredTZA-hide-field-toggle (sym)
  "Toggle visibility of field SYM in the ls -l lines of dired buffers."
  (if (diredTZA-invisible-prop-p sym)
        (remove-from-invisibility-spec sym)
    (add-to-invisibility-spec sym))
  (font-lock-flush))

(defun diredTZA-hide-fields-add-menu ()
  "Add Hide/Show menu for ls -l fields in Dired menu.
Add this function to `dired-mode'."
  (easy-menu-add-item nil '("Dir" "Hide/Show")
                      (append '("Hide/Show Fields"
                                ["Customize" (customize-option 'diredTZA-invisible-props) t])
                              (mapcar
                               (lambda (field)
                                 (let ((sym (list 'quote (car field)))
                                       (doc (nth 2 field)))
                                   (vector doc
                                           `(diredTZA-hide-field-toggle ,sym)
                                           :style 'toggle
                                           :selected `(memq ,sym buffer-invisibility-spec))))
                               diredTZA-ls-output-fields)))
  (mapc #'add-to-invisibility-spec diredTZA-invisible-props))

(add-hook 'dired-mode-hook #'diredTZA-hide-fields-add-menu t)
