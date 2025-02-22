import { Component, OnInit, TemplateRef } from "@angular/core";
import { UserService } from "../../services/user.service";
import { FaceService } from "../../services/face.service";
import { ConfidenceLevelsService } from "../../services/confidence-levels.service";
import { environment } from "../../../environments/environment";
import { BsModalService, BsModalRef } from "ngx-bootstrap/modal";
import { Face } from "../../models/face";
import { take } from "rxjs/operators";
import { Console } from "console";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "app-confidence-levels",
  templateUrl: "confidence-levels.components.html",
  providers: [UserService, ConfidenceLevelsService, FaceService],
})
export class ConfidenceLevelsComponent implements OnInit {
  public face: Face;
  public identity;
  public token;
  modalRef: BsModalRef;
  public confidenceLevels: Array<any> = [];
  public photo_default = "../../../assets/img/avatars/default.png";
  public url: string;
  public page = 1;
  public count = 0;
  public tableSize;
  public returnedArray: string[];

  constructor(
    private _userService: UserService,
    private modalService: BsModalService,
    private _confidenceLevels: ConfidenceLevelsService,
    private _faceService: FaceService,
    private toastr: ToastrService
  ) {
    this.identity = this._userService.identity;
    this.token = this._userService.token;
    this.face = new Face("", "", "", "", "", "", "", "", true);
    this.url = environment.url;
  }

  ngOnInit() {
    this.getFaces();
  }

  public get envUrl () {
    return environment.url;
  }

  public getConfidenceLevels(faces: any[]) {
    this._confidenceLevels.getConfidenceLevels().subscribe((levels: any[]) => {
      levels.map((level: any, i: number) => {
        level.faces = faces.filter((face: any) => face?.confidenceLevels === level?._id);
        level.paginationId = 'facesLevel' + (i + 1);
        level.currentPage = 1;
      });
      this.confidenceLevels = levels;
    });
  }

  public getFaces() {
    this._faceService.getFaceByUser(this.identity).pipe(take(1)).subscribe((response: any) => this.getConfidenceLevels(response));
  }

  //Abrir modal
  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, {
      class: "modal-lg modal-dialog-centered",
    });
  }

  editUser(x, user) {
    this.openModal(x);
    this.face = user;
  }

  //Eliminar un rostro
  deleteFace(id) {
    this._faceService.removeFace(id).subscribe(
      (data) => {
        this.toastr.success('Excelente', 'Rostro eliminado con éxito');
        this.getFaces();
      },
      (err) => {}
    );
  }

  onSubmitEdit() {
    if (this.face.confidenceLevels !== '634ad8c8043dd000160b3585') {
      this.face.unknown = false;
    }
    this._faceService.editFace(this.face).subscribe(
      (data) => {
        this.face = data.face;
        localStorage.setItem("identity", JSON.stringify(this.identity));

        if (!this.filesToUpload) {
        } else {
          this.makeFileRequest(
            this.url + "upload-image-face/" + this.face._id,
            [],
            this.filesToUpload
          ).then((result: any) => {
            this.face.image = result.image;
            localStorage.setItem("identity", JSON.stringify(this.identity));
            this.toastr.success('El usuario ha sido editado con éxito.');
            this.getFaces();
          });
        }

        this.getFaces();
        this.modalRef.hide();
      },
      (err) => {}
    );
  }

  onSubmit() {
    let payload = this.face;
    payload.user = this.identity;
    if (payload.confidenceLevels !== '634ad8c8043dd000160b3585') {
      payload.unknown = false;
    }
    this._faceService.addFace(payload).subscribe(
      (data) => {
        this.face = data.face;
        localStorage.setItem("identity", JSON.stringify(this.identity));

        if (this.filesToUpload) {
          this.makeFileRequest(
            this.url + "upload-image-face/" + this.face._id,
            [],
            this.filesToUpload
          ).then((result: any) => {
            this.face.image = result.image;
            localStorage.setItem("identity", JSON.stringify(this.identity));
            this.toastr.success('El usuario ha sido agregado con éxito.');
            this.face = new Face("", "", "", "", "", "", "", "", true);
            this.getFaces();
          });
        }
        this.modalRef.hide();
      },
      (err) => {}
    );
  }

  public hasFormat(name: string) {
    return name.includes('.jpg') || name.includes('.png') || name.includes('.svg') || name.includes('.jpeg');
  }

  public imageURL(name: string) {
    return this.hasFormat(name) ? 'get-image-face/' : 'get-image/';
  }

  public filesToUpload: Array<File>;
  //Método de subir imagen
  fileChangeEvent(fileInput: any) {
    const files = <Array<File>>fileInput.target.files;
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    console.log('photo', files);
    if (!supportedFormats.find(type =>  type == files[0].type)) {
      this.toastr.error('El formato de la imagen debe ser correcto (jpg o png)');
    } else if (files[0].size > 2024000) {
      this.toastr.error('El tamaño de la imagen es muy grande, no debe exceder los 2MB');
    } else {
      this.filesToUpload = files;
      this.toastr.success('Imagen cargada con éxito');
    }
  }

  makeFileRequest(url: string, params: Array<string>, file: Array<File>) {
    //pasar el token del usu identificado
    var token = this.token;

    return new Promise(function (resolve, reject) {
      var formData: any = new FormData();
      var xhr = new XMLHttpRequest();

      //recorrer los ficheros para subirlos
      for (var i = 0; i < file.length; i++) {
        formData.append("imagen", file[i], file[i].name);
        formData.append("name", file[i].name);
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(xhr.response);
          }
        }
      };

      //lanzar la petición
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", token);
      xhr.send(formData);
    });
  }
}
