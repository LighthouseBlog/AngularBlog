import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { Router } from 'app/app.routing';

import { FroalaEditorModule, FroalaViewModule } from 'angular-froala-wysiwyg';

import { EditorComponent } from './editor/editor.component';
import { UserArticlesComponent } from './user-articles/user-articles.component';
import { CreateArticleModalComponent } from './create-article-modal/create-article-modal.component';

import { DeleteArticleModalComponent } from './delete-article-modal/delete-article-modal.component';
import { SettingsModalComponent } from './settings-modal/settings-modal.component';
import { ArticleListComponent } from './user-articles/article-list/article-list.component';
import { ImagePreviewComponent } from 'app/article-portal/image-preview/image-preview.component';

import { MaterialModule } from 'app/material.module';
import { CreateArticleFormService } from './create-article-modal/create-article-form.service';
import { DirectiveModule } from '../_directives/directive.module';

@NgModule({
    declarations: [
        EditorComponent,
        UserArticlesComponent,
        CreateArticleModalComponent,
        DeleteArticleModalComponent,
        SettingsModalComponent,
        ArticleListComponent,
        ImagePreviewComponent
    ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        Router,
        MaterialModule,
        FroalaEditorModule.forRoot(),
        FroalaViewModule.forRoot(),
        DirectiveModule
    ],
    entryComponents: [
        CreateArticleModalComponent,
        DeleteArticleModalComponent,
        SettingsModalComponent,
        ImagePreviewComponent
    ],
    providers: [
        CreateArticleFormService
    ]
})
export class ArticlePortalModule { }
