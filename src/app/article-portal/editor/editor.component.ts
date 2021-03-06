import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material';

import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { EditorService } from 'app/_services/editor.service';
import { ArticleService } from 'app/_services/article.service';
import { ImagesService } from 'app/_services/images.service';
import { SnackbarMessagingService } from 'app/_services/snackbar-messaging.service';

import initializeFroalaGistPlugin from 'app/_plugins/gist.plugin'

import { FileValidator } from 'app/_directives/fileValidator.directive';
import { ImagePreviewComponent } from 'app/article-portal/image-preview/image-preview.component';

const ENTER_KEY = 13;

@Component({
    selector: 'editor',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit, OnDestroy {

    private tb = ['fullscreen', 'bold', 'italic', 'underline', 'strikeThrough',
        'subscript', 'superscript', '|', 'inlineStyle',
        'paragraphStyle', '|', 'paragraphFormat', 'align', 'formatOL', 'formatUL', 'outdent',
        'indent', 'quote', '-', 'insertLink', 'insertImage', 'insertVideo', 'insertFile',
        'insertTable', '|', 'emoticons', 'specialCharacters', 'insertHR', 'selectAll',
        'clearFormatting', '|', 'print', 'spellChecker', 'help', 'html', '|', 'undo', 'redo', 'github']
    private options: Object = {
        placeholderText: 'Edit Content Here',
        charCounterCount: true,
        htmlAllowedTags: ['.*'],
        htmlAllowedAttrs: ['.*'],
        htmlRemoveTags: [''],
        htmlAllowedStyleProps: ['.*'],
        htmlDoNotWrapTags: [''],
        pasteAllowedStyleProps: ['.*'],
        lineBreakerTags: [''],
        tableStyles: {},
        linkAlwaysBlank: true,
        toolbarSticky: false,
        keepFormatOnDelete: true,
        tabSpaces: 2,
        events: {
            'froalaEditor.contentChanged': (e, editor) => {
                this.updateContent(editor);
            },
            'froalaEditor.image.removed': (e, editor, $img) => {
                const src = $img.attr('src');
                this.imagesService.deleteImage(src)
                    .subscribe(() => {}, error => this.sms.displayError(error, 4000) )
            }
        },
        toolbarButtons: this.tb,
        toolbarButtonsMD: this.tb,
        toolbarButtonsSM: this.tb,
        toolbarButtonsXS: this.tb,
    };
    private content: string;
    private destroyed: Subject<boolean> = new Subject<boolean>();
    private articleId: number;

    editorContent: string;
    editing = false;
    formGroup: FormGroup;
    initControls: any;
    filteredTags: Observable<string[]>;
    selectedTags: Set<string>;
    tagInput: string;
    removable = true;
    image: any;
    savingArticle: boolean;

    constructor(private editorService: EditorService,
                private articleService: ArticleService,
                private imagesService: ImagesService,
                private fb: FormBuilder,
                private route: ActivatedRoute,
                private sms: SnackbarMessagingService,
                private dialog: MatDialog) {
        this.formGroup = this.fb.group({
            'articleTitle': new FormControl('', Validators.required),
            'articleDescription': new FormControl('', Validators.required),
            'tags': new FormControl(''),
            'coverPhoto': new FormControl('', [FileValidator.validate])
        });
    }

    initialize(initControls) {
        this.imagesService.getHash()
            .subscribe(hash => {
                this.options['imageUploadToS3'] = hash;

                this.initControls = initControls;
                this.initControls.initialize();
            }, error => this.sms.displayError(error));
    }

    ngOnInit() {
        this.selectedTags = new Set<string>();
        this.formGroup.get('tags').valueChanges
            .pipe(takeUntil(this.destroyed))
            .subscribe((input) => {
                this.filteredTags = this.filterTags(input);
            });

        initializeFroalaGistPlugin(this.editorService);
        this.editing = true;
        this.route.params.subscribe(params => {
            this.articleId = params['id'];

            this.articleService.getArticle(this.articleId)
                .pipe(takeUntil(this.destroyed))
                .subscribe(article => {
                    this.formGroup.patchValue({
                        articleTitle: article.title,
                        articleDescription: article.description,
                        tags: '',
                        coverPhoto: {}
                    });
                    this.image = article.coverPhoto;
                    if (article.tags instanceof Array) {
                        this.selectedTags = new Set<string>(article.tags);
                    }
                    this.editorContent = article.text;
                }, error => this.sms.displayError(error));
        });
    }

    ngOnDestroy() {
        this.destroyed.next();
        this.destroyed.complete();
    }

    updateContent(editor) {
        this.content = editor.html.get();
    }

    saveArticle(formValue: any, isFormValid: boolean) {
        if (isFormValid) {
            const articleTitle = formValue['articleTitle'];
            const articleDescription = formValue['articleDescription'];
            const coverPhoto = formValue['coverPhoto'];
            const tags = Array.from(this.selectedTags);
            this.savingArticle = true;
            if (coverPhoto) {
                const formData = new FormData();
                const file = this.getCoverPhoto(coverPhoto);
                formData.append('coverPhoto', file);

                this.editorService.saveArticle(this.articleId, this.content, articleTitle, articleDescription, tags, formData).pipe(
                    takeUntil(this.destroyed),
                    finalize(() => this.savingArticle = false))
                    .subscribe(() => {
                        this.sms.displaySuccess('Successfully saved article', 4000);
                    }, error => this.sms.displayError(error, 4000));
            } else {
                this.editorService.saveArticle(this.articleId, this.content, articleTitle, articleDescription, tags).pipe(
                    takeUntil(this.destroyed),
                    finalize(() => this.savingArticle = false))
                    .subscribe(() => {
                        this.sms.displaySuccess('Successfully saved article', 4000);
                    }, error => this.sms.displayError(error, 4000));
            }
        } else {
            this.sms.displayErrorMessage('Form is invalid');
        }
    }

    getCoverPhoto(coverPhoto: any) {
        if (coverPhoto.target) {
            return coverPhoto.target.files[0];
        }
        return coverPhoto;
    }

    publishArticle() {
        this.editorService.publishArticle(this.articleId)
            .pipe(takeUntil(this.destroyed))
            .subscribe(() => {
                this.sms.displaySuccess('Successfully published article', 4000);
            }, error => this.sms.displayError(error, 4000));
    }

    filterTags(text: string): Observable<string[]> {
        return this.editorService.getTags(text);
    }

    removeTag(tag: string) {
        this.selectedTags.delete(tag);
    }

    tagSelected(tag: string) {
        if (this.selectedTags.has(this.tagInput)) {
            this.sms.displayErrorMessage('Tag already exists', 2000);
        } else {
            this.selectedTags.add(tag);
            this.sms.displaySuccess(`Added the tag: ${tag}`, 2000);
            this.formGroup.get('tags').patchValue('');
        }
    }

    onEnter(event: any) {
        if (event.keyCode === ENTER_KEY && this.tagInput) {
            if (this.selectedTags.has(this.tagInput)) {
                this.sms.displayErrorMessage('Tag already exists', 2000);
            } else {
                const input = this.tagInput;
                this.editorService.addTag(input)
                    .pipe(takeUntil(this.destroyed))
                    .subscribe(() => {
                        this.selectedTags.add(input);
                        this.sms.displaySuccess(`Added the tag: ${input}`, 2000);
                        this.formGroup.get('tags').patchValue('');
                    }, error => this.sms.displayError(error, 2000));
            }
        }
    }

    fileChangeListener($event) {
        const file = $event.target.files[0];
        const myReader = new FileReader();
        myReader.onloadend = (loadEvent: any) => {
            this.image = loadEvent.target.result;
        };

        myReader.readAsDataURL(file);
    }

    openPreview() {
        this.dialog.open(ImagePreviewComponent, {
                maxWidth: '800px',
                maxHeight: '400px',
                data: {
                    src: this.image,
                    aspectRatio: 16 / 9
                }
            })
            .afterClosed()
            .pipe(takeUntil(this.destroyed))
            .subscribe(result => {
                if (result) {
                    this.formGroup.patchValue({
                        coverPhoto: result
                    });
                }
            }, error => this.sms.displayError(error));
    }

    canPreviewImage(): boolean {
        return !!this.image;
    }
}
