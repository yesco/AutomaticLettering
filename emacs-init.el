;; https://stackoverflow.com/questions/17659212/dont-display-compilation-buffer-in-emacs-until-the-process-exits-with-error-o

;; 
(defun AL-check ()
  "Check AL files at save time"
  (save-window-excursion
    (compile "./check")))

(setq compilation-auto-jump-to-first-error nil)

;; this will open he file and display the compilation if there was an error
;; if there is no error, it'll say "moved past last error"
(add-hook 'compilation-finish-functions
	  'next-error)


(add-hook 'after-save-hook 'AL-check)

;; (AL-check)

;; (add-hook 'after-save-hook #'AL-check)

(setq c-basic-offset 2)
(setq js-indent-level 2)
(setq wrap-prefix "\t\t\-\\\\")

(defun my-next-error
   (orig-fun &rest args)
   (ignore-errors
     (apply orig-fun args)))
     
(advice-add 'next-error :around
	    #'my-next-error)
